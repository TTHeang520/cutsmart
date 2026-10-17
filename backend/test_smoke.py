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
                client = api.app.test_client()
                response = client.post("/api/register", json={
                    "username": "release-test", "email": "test@example.com",
                    "password": "test-password-only",
                })
                self.assertLess(response.status_code, 300)
                login = client.post("/api/login", json={
                    "email": "test@example.com", "password": "test-password-only",
                }).get_json()
                user_id = login["user"]["id"]
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
                new = client.post("/api/plans/save", json={**payload, "mode": "new"}).get_json()
                self.assertNotEqual(new["journey_id"], journey_id)
                self.assertEqual(len(database.get_weight_history(user_id, new["journey_id"])), 1)
                archived = client.get(f"/api/users/{user_id}/journeys/{journey_id}/weights")
                self.assertEqual(archived.status_code, 200)
                self.assertEqual(archived.get_json()["journey"]["status"], "archived")
                self.assertEqual(len(archived.get_json()["weights"]), 2)
                self.assertEqual(client.get(
                    f"/api/users/{user_id + 1}/journeys/{journey_id}/weights"
                ).status_code, 404)
                database.init_db()
                self.assertEqual(len(database.get_weight_history(user_id, journey_id)), 2)
            finally:
                database.DATABASE_NAME = original_database


if __name__ == "__main__":
    unittest.main()
