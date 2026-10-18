"""Local-release regression checks; all records live in a temporary database."""
import importlib
import tempfile
import unittest
from pathlib import Path

import database


class JourneySmokeTest(unittest.TestCase):
    def test_plan_updates_preserve_logs_and_new_journey_archives_them(self):
        original_database = database.DATABASE_NAME
        with tempfile.TemporaryDirectory() as folder:
            database.DATABASE_NAME = Path(folder) / "test.sqlite"
            try:
                api = importlib.import_module("app")
                database.init_db()
                api.init_auth(api.app)
                client = api.app.test_client()
                client.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
                response = client.post("/api/register", json={
                    "username": "release-test", "email": "test@example.com",
                    "password": "test-password-only",
                })
                self.assertLess(response.status_code, 300)
                login = client.post("/api/login", json={
                    "email": "test@example.com", "password": "test-password-only",
                }).get_json()
                user_id = login["user"]["id"]
                client.environ_base["HTTP_X_CSRF_TOKEN"] = login["csrf_token"]
                inputs = {
                    "age": 25, "gender": "male", "height_cm": 175,
                    "current_weight_kg": 80, "target_weight_kg": 72,
                    "daily_activity_level": "light_daily_movement",
                    "strategy": "balanced",
                }
                generated = client.post("/api/plan", json=inputs)
                self.assertEqual(generated.status_code, 200, generated.get_json())
                payload = {"user_id": user_id, "input_data": inputs,
                           "plan_result": generated.get_json()["plan"]}
                first = client.post("/api/plans/save", json=payload).get_json()
                journey_id = first["journey_id"]
                weight = client.post("/api/weights", json={
                    "user_id": user_id, "weight_kg": 79.75,
                    "logged_date": "2026-10-18",
                })
                self.assertEqual(weight.status_code, 200, weight.get_json())
                updated = client.post("/api/plans/save", json=payload).get_json()
                self.assertEqual(updated["journey_id"], journey_id)
                self.assertNotEqual(updated["plan_id"], first["plan_id"])
                self.assertEqual(len(database.get_weight_history(user_id, journey_id)), 2)
                option_inputs = {**inputs, "desired_timeline_weeks": 1}
                for option in ("fastest_safe", "steady"):
                    option_response = client.post("/api/plan", json={
                        **option_inputs, "plan_option": option,
                    })
                    self.assertEqual(option_response.status_code, 200)
                    option_plan = option_response.get_json()["plan"]
                    saved_option = client.post("/api/plans/save", json={
                        "user_id": user_id, "mode": "update",
                        "input_data": option_inputs, "plan_result": option_plan,
                    })
                    self.assertEqual(saved_option.status_code, 200)
                    self.assertEqual(saved_option.get_json()["journey_id"], journey_id)
                    latest = dict(database.get_latest_user_plan(user_id))
                    self.assertEqual(latest["daily_deficit"], option_plan["daily_deficit"])
                    self.assertEqual(latest["timeline_status"], option_plan["timeline_status"])
                    self.assertEqual(len(database.get_weight_history(user_id, journey_id)), 2)
                new = client.post("/api/plans/save", json={**payload, "mode": "new"}).get_json()
                self.assertNotEqual(new["journey_id"], journey_id)
                self.assertEqual(len(database.get_weight_history(user_id, new["journey_id"])), 1)
                archived = client.get(f"/api/users/{user_id}/journeys/{journey_id}/weights")
                self.assertEqual(archived.status_code, 200)
                self.assertEqual(archived.get_json()["journey"]["status"], "archived")
                self.assertEqual(len(archived.get_json()["weights"]), 2)
                self.assertEqual(client.get(
                    f"/api/users/{user_id + 1}/journeys/{journey_id}/weights"
                ).status_code, 403)
                database.init_db()
                self.assertEqual(len(database.get_weight_history(user_id, journey_id)), 2)
            finally:
                database.DATABASE_NAME = original_database


if __name__ == "__main__":
    unittest.main()
