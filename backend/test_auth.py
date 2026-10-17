import importlib
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

import database


class AuthenticationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original = database.DATABASE_NAME
        database.DATABASE_NAME = Path(self.temp.name) / "auth.sqlite"
        self.api = importlib.import_module("app")
        database.init_db()
        self.api.init_auth(self.api.app)
        self.client = self.api.app.test_client()
        self.client.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
        for name in ("alice", "bob"):
            self.client.post("/api/register", json={
                "username": name, "email": name + "@example.com", "password": "test-password",
            })
        result = self.client.post("/api/login", json={
            "email": "alice@example.com", "password": "test-password",
        })
        self.cookie = result.headers["Set-Cookie"]
        self.token = result.json["csrf_token"]
        self.client.environ_base["HTTP_X_CSRF_TOKEN"] = self.token

    def tearDown(self):
        database.DATABASE_NAME = self.original
        self.temp.cleanup()

    def test_requires_session_and_rejects_spoofed_user_ids(self):
        self.assertEqual(self.api.app.test_client().get("/api/weights/history/1").status_code, 401)
        self.assertEqual(self.client.get("/api/weights/history/2").status_code, 403)
        self.assertEqual(self.client.post("/api/weights", json={"user_id": 2}).status_code, 403)
        self.assertEqual(self.client.post("/api/foods/1/photo", data={"user_id": "2"}).status_code, 403)
        self.assertEqual(self.client.get("/api/uploads/food_photos/unknown.jpg").status_code, 404)

    def test_csrf_logout_and_cookie_flags(self):
        self.assertIn("HttpOnly", self.cookie)
        self.assertIn("SameSite=Lax", self.cookie)
        self.assertEqual(self.client.post("/api/logout", headers={"X-CSRF-Token": "wrong"}).status_code, 403)
        self.assertEqual(self.client.get("/api/session").status_code, 200)
        self.assertEqual(self.client.post("/api/logout").status_code, 200)
        self.assertEqual(self.client.get("/api/session").status_code, 401)

    def test_expired_session(self):
        connection = database.get_db_connection()
        connection.execute("UPDATE auth_sessions SET expires_at = 0")
        connection.commit()
        connection.close()
        self.assertEqual(self.client.get("/api/session").status_code, 401)

    def test_private_photo_and_revoked_cookie_replay(self):
        connection = database.get_db_connection()
        connection.execute("INSERT INTO plan_journeys (user_id, initial_weight_kg, target_weight_kg) VALUES (1, 80, 70)")
        connection.execute("""INSERT INTO food_logs
            (user_id, journey_id, food_name, calories, meal_type, logged_date, logged_time, photo_path)
            VALUES (1, 1, 'Rice', 100, 'lunch', '2026-10-18', '12:00', 'food_photos/private.jpg')""")
        connection.commit()
        connection.close()
        with patch.object(self.api, "send_from_directory", return_value="image") as serve:
            self.assertEqual(self.client.get("/api/uploads/food_photos/private.jpg").status_code, 200)
            serve.assert_called_once()
            bob = self.api.app.test_client()
            bob.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
            bob.post("/api/login", json={"email": "bob@example.com", "password": "test-password"})
            self.assertEqual(bob.get("/api/uploads/food_photos/private.jpg").status_code, 404)
            serve.assert_called_once()
        stolen = self.client.get_cookie("cutsmart_session").value
        self.client.post("/api/logout")
        self.client.set_cookie("cutsmart_session", stolen)
        self.assertEqual(self.client.get("/api/session").status_code, 401)

    def test_cross_site_form_login_rejected(self):
        self.assertEqual(self.api.app.test_client().post("/api/login", json={
            "email": "alice@example.com", "password": "test-password",
        }).status_code, 403)
