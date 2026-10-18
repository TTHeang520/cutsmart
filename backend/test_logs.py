"""Regression checks for weight notes, journey start dates and food photo cleanup."""
import importlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import database

PLAN_INPUT = {
    "age": 30, "gender": "male", "height_cm": 175, "current_weight_kg": 80,
    "target_weight_kg": 72, "daily_activity_level": "mostly_sitting",
    "strategy": "balanced", "desired_timeline_weeks": 20,
}


class LogRegressionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original = database.DATABASE_NAME
        database.DATABASE_NAME = Path(self.temp.name) / "logs.sqlite"
        self.api = importlib.import_module("app")
        database.init_db()
        self.api.init_auth(self.api.app)
        self.photos = Path(self.temp.name) / "uploads" / "food_photos"
        self.photos.mkdir(parents=True)
        self.photo_patch = patch.object(self.api, "FOOD_PHOTO_FOLDER", self.photos)
        self.photo_patch.start()
        self.client = self.api.app.test_client()
        self.client.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
        self.client.post("/api/register", json={
            "username": "logger", "email": "logger@example.com", "password": "test-password",
        })
        login = self.client.post("/api/login", json={
            "email": "logger@example.com", "password": "test-password",
        }).json
        self.user_id = login["user"]["id"]
        self.client.environ_base["HTTP_X_CSRF_TOKEN"] = login["csrf_token"]
        plan = self.client.post("/api/plan", json=PLAN_INPUT).json["plan"]
        saved = self.client.post("/api/plans/save", json={
            "user_id": self.user_id, "mode": "new", "input_data": PLAN_INPUT,
            "plan_result": plan, "start_date": "2026-10-17",
        })
        self.assertEqual(saved.status_code, 200)

    def tearDown(self):
        self.photo_patch.stop()
        database.DATABASE_NAME = self.original
        self.temp.cleanup()

    def test_initial_weight_uses_client_start_date(self):
        history = self.client.get(f"/api/weights/history/{self.user_id}").json["history"]
        self.assertEqual([(row["logged_date"], row["is_initial"]) for row in history],
                         [("2026-10-17", 1)])

    def test_weight_note_is_saved_and_updated(self):
        for note in ("  after run  ", ""):
            response = self.client.post("/api/weights", json={
                "user_id": self.user_id, "weight_kg": 79.4,
                "logged_date": "2026-10-18", "note": note,
            })
            self.assertEqual(response.status_code, 200)
            latest = self.client.get(f"/api/weights/latest/{self.user_id}").json["latest"]
            self.assertEqual(latest["note"], note.strip() or None)
        bad = self.client.post("/api/weights", json={
            "user_id": self.user_id, "weight_kg": 79, "logged_date": "2026-10-18", "note": 5,
        })
        self.assertEqual(bad.status_code, 400)

    def test_deleting_food_removes_its_photo_file(self):
        food = self.client.post("/api/foods", json={
            "user_id": self.user_id, "food_name": "Rice", "calories": 400,
            "meal_type": "lunch", "logged_date": "2026-10-18", "logged_time": "12:30",
        }).json["food"]
        image = io.BytesIO()
        Image.new("RGB", (4, 4)).save(image, "PNG")
        image.seek(0)
        upload = self.client.post(f"/api/foods/{food['id']}/photo", data={
            "user_id": str(self.user_id), "photo": (image, "meal.png"),
        })
        self.assertEqual(upload.status_code, 200)
        photo_file = self.photos / Path(upload.json["photo_path"]).name
        self.assertTrue(photo_file.is_file())

        deleted = self.client.delete(f"/api/foods/{food['id']}", json={"user_id": self.user_id})
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(photo_file.exists())

    def test_calendar_can_read_entries_from_archived_journeys(self):
        self.client.post("/api/foods", json={
            "user_id": self.user_id, "food_name": "Oats", "calories": 300,
            "meal_type": "breakfast", "logged_date": "2026-10-18", "logged_time": "08:00",
        })
        plan = self.client.post("/api/plan", json=PLAN_INPUT).json["plan"]
        self.client.post("/api/plans/save", json={
            "user_id": self.user_id, "mode": "new", "input_data": PLAN_INPUT, "plan_result": plan,
        })
        url = f"/api/foods/{self.user_id}?date=2026-10-18"
        self.assertEqual(self.client.get(url).json["foods"], [])
        self.assertEqual([food["food_name"] for food in self.client.get(url + "&all_journeys=1").json["foods"]],
                         ["Oats"])

    def test_email_is_case_insensitive(self):
        duplicate = self.client.post("/api/register", json={
            "username": "copy", "email": "  LOGGER@Example.com ", "password": "test-password",
        })
        self.assertEqual(duplicate.status_code, 400)
        login = self.client.post("/api/login", json={
            "email": "Logger@EXAMPLE.com", "password": "test-password",
        })
        self.assertEqual(login.status_code, 200)

    def test_legacy_mixed_case_email_can_still_log_in(self):
        database.create_user("old", "Legacy@Example.com", self.api.generate_password_hash("old-password"))
        login = self.client.post("/api/login", json={
            "email": "legacy@example.com", "password": "old-password",
        })
        self.assertEqual(login.status_code, 200)

    def test_weight_delete_keeps_baseline(self):
        self.client.post("/api/weights", json={
            "user_id": self.user_id, "weight_kg": 79, "logged_date": "2026-10-18",
        })
        history = self.client.get(f"/api/weights/history/{self.user_id}").json["history"]
        regular = next(row for row in history if not row["is_initial"])
        initial = next(row for row in history if row["is_initial"])

        refused = self.client.delete(f"/api/weights/{initial['id']}", json={"user_id": self.user_id})
        self.assertEqual(refused.status_code, 400)
        deleted = self.client.delete(f"/api/weights/{regular['id']}", json={"user_id": self.user_id})
        self.assertEqual(deleted.status_code, 200)
        missing = self.client.delete(f"/api/weights/{regular['id']}", json={"user_id": self.user_id})
        self.assertEqual(missing.status_code, 404)
        history = self.client.get(f"/api/weights/history/{self.user_id}").json["history"]
        self.assertEqual([row["id"] for row in history], [initial["id"]])

    def test_weight_delete_rejects_other_users(self):
        self.assertEqual(self.client.delete("/api/weights/1", json={"user_id": self.user_id + 1}).status_code, 403)

    def test_food_edit_keeps_photo(self):
        food = self.client.post("/api/foods", json={
            "user_id": self.user_id, "food_name": "Rice", "calories": 400,
            "meal_type": "lunch", "logged_date": "2026-10-18", "logged_time": "12:30",
        }).json["food"]
        image = io.BytesIO()
        Image.new("RGB", (4, 4)).save(image, "PNG")
        image.seek(0)
        photo_path = self.client.post(f"/api/foods/{food['id']}/photo", data={
            "user_id": str(self.user_id), "photo": (image, "meal.png"),
        }).json["photo_path"]

        updated = self.client.put(f"/api/foods/{food['id']}", json={
            "user_id": self.user_id, "food_name": "Chicken rice", "calories": 550,
            "meal_type": "dinner", "logged_date": "2026-10-18", "logged_time": "19:00",
            "notes": "extra chilli",
        })
        self.assertEqual(updated.status_code, 200)
        [row] = self.client.get(f"/api/foods/{self.user_id}?date=2026-10-18").json["foods"]
        self.assertEqual((row["food_name"], row["calories"], row["notes"], row["photo_path"]),
                         ("Chicken rice", 550, "extra chilli", photo_path))

    def test_registration_rejects_bad_email_and_short_password(self):
        cases = [
            ("tan@gmail.c", "long-enough-pw", "valid email"),
            ("tan@gmail.co", "long-enough-pw", "Did you mean tan@gmail.com?"),
            ("tan@outlook.com", "short", "at least 8 characters"),
        ]
        for email, password, message in cases:
            response = self.client.post("/api/register", json={
                "username": "newbie", "email": email, "password": password,
            })
            self.assertEqual(response.status_code, 400, email)
            self.assertIn(message, response.json["message"])
        accepted = self.client.post("/api/register", json={
            "username": "newbie", "email": "tan@outlook.com", "password": "long-enough-pw",
        })
        self.assertEqual(accepted.status_code, 200)

    def test_daily_activity_summarises_logs(self):
        for name, calories, logged_date in (("Oats", 300, "2026-10-16"), ("Rice", 500, "2026-10-16"),
                                            ("Soup", 200, "2026-10-18")):
            self.client.post("/api/foods", json={
                "user_id": self.user_id, "food_name": name, "calories": calories,
                "meal_type": "lunch", "logged_date": logged_date, "logged_time": "12:00",
            })
        self.client.post("/api/exercises", json={
            "user_id": self.user_id, "exercise_name": "Run", "category": "cardio",
            "duration_minutes": 30, "calories_burned": 250,
            "logged_date": "2026-10-16", "logged_time": "07:00",
        })
        self.client.post("/api/weights", json={
            "user_id": self.user_id, "weight_kg": 79, "logged_date": "2026-10-19",
        })

        days = self.client.get(
            f"/api/activity/{self.user_id}?start=2026-10-01&end=2026-10-31"
        ).json["days"]
        # setUp's automatic baseline weight (2026-10-17) is not counted as activity.
        self.assertEqual([day["date"] for day in days], ["2026-10-16", "2026-10-18", "2026-10-19"])
        self.assertEqual((days[0]["calories_eaten"], days[0]["calories_burned"], days[0]["active_minutes"],
                          days[0]["food_entries"], days[0]["exercise_entries"]), (800, 250, 30, 2, 1))
        self.assertTrue(days[2]["weight_logged"])

        bad = self.client.get(f"/api/activity/{self.user_id}?start=2026-10-31&end=2026-10-01")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self.client.get(f"/api/activity/{self.user_id + 1}?start=2026-10-01&end=2026-10-02").status_code, 403)


if __name__ == "__main__":
    unittest.main()
