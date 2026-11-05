"""Regression checks for the pre-launch backend fixes."""
import importlib
import io
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import database

PLAN_INPUT = {
    "age": 30, "gender": "male", "height_cm": 175, "current_weight_kg": 80,
    "target_weight_kg": 72, "daily_activity_level": "mostly_sitting",
    "strategy": "balanced", "desired_timeline_weeks": 20,
}


class ApiTestCase(unittest.TestCase):
    """Starts each test with a fresh database, one logged-in user and an active journey."""

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original = database.DATABASE_NAME
        database.DATABASE_NAME = Path(self.temp.name) / "launch.sqlite"
        self.api = importlib.import_module("app")
        database.init_db()
        self.api.init_auth(self.api.app)
        self.photos = Path(self.temp.name) / "uploads" / "food_photos"
        self.photos.mkdir(parents=True)
        self.photo_patch = patch.object(self.api, "FOOD_PHOTO_FOLDER", self.photos)
        self.photo_patch.start()
        self.client, self.user_id = self.login("launch@example.com")
        self.save_plan(PLAN_INPUT, mode="new", start_date="2026-10-01")

    def tearDown(self):
        self.photo_patch.stop()
        database.DATABASE_NAME = self.original
        self.temp.cleanup()

    def login(self, email):
        client = self.api.app.test_client()
        client.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
        client.post("/api/register", json={
            "username": "launch", "email": email, "password": "test-password",
        })
        login = client.post("/api/login", json={"email": email, "password": "test-password"}).json
        client.environ_base["HTTP_X_CSRF_TOKEN"] = login["csrf_token"]
        return client, login["user"]["id"]

    def save_plan(self, inputs, plan_result=None, **extra):
        if plan_result is None:
            plan_result = self.client.post("/api/plan", json=inputs).json["plan"]
        response = self.client.post("/api/plans/save", json={
            "user_id": self.user_id, "input_data": inputs, "plan_result": plan_result, **extra,
        })
        self.assertEqual(response.status_code, 200, response.json)
        return response.json

    def journey_id(self):
        return database.get_active_journey(self.user_id)["id"]


class PlanValidationTest(ApiTestCase):
    def test_saved_plan_is_recalculated_on_the_server(self):
        honest = self.client.post("/api/plan", json=PLAN_INPUT).json["plan"]
        tampered = {**honest, "target_calories": 1, "daily_deficit": 5000, "protein_g": 999}
        saved = self.save_plan(PLAN_INPUT, plan_result=tampered)
        stored = dict(database.get_latest_user_plan(self.user_id))
        self.assertEqual(stored["target_calories"], honest["target_calories"])
        self.assertEqual(stored["daily_deficit"], honest["daily_deficit"])
        self.assertEqual(saved["plan"]["target_calories"], honest["target_calories"])

    def test_plan_result_is_optional_when_saving(self):
        response = self.client.post("/api/plans/save", json={
            "user_id": self.user_id, "input_data": PLAN_INPUT,
        })
        self.assertEqual(response.status_code, 200, response.json)

    def test_out_of_range_and_malformed_inputs_are_rejected(self):
        cases = {
            "age": 12, "height_cm": 50, "current_weight_kg": 400,
            "desired_timeline_weeks": 0,
        }
        for field, value in cases.items():
            with self.subTest(field=field):
                response = self.client.post("/api/plan", json={**PLAN_INPUT, field: value})
                self.assertEqual(response.status_code, 400)
                saved = self.client.post("/api/plans/save", json={
                    "user_id": self.user_id, "input_data": {**PLAN_INPUT, field: value},
                })
                self.assertEqual(saved.status_code, 400)
        for value in ("NaN", "inf", True, [], {}):
            with self.subTest(age=value):
                response = self.client.post("/api/plan", json={**PLAN_INPUT, "age": value})
                self.assertEqual(response.status_code, 400)

    def test_underweight_target_is_rejected_with_a_suggestion(self):
        response = self.client.post("/api/plan", json={**PLAN_INPUT, "target_weight_kg": 50})
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 56.7 kg", response.json["message"])

    def test_non_object_bodies_get_json_errors_not_crashes(self):
        for path in ("/api/plan", "/api/plans/save", "/api/foods", "/api/exercises", "/api/weights"):
            for body in ([1, 2], "text"):
                with self.subTest(path=path, body=body):
                    response = self.client.post(path, json=body)
                    self.assertEqual(response.status_code, 400)
                    self.assertFalse(response.json["success"])

    def test_plans_for_unknown_journey_return_not_found(self):
        response = self.client.get(f"/api/users/{self.user_id}/journeys/9999/plans")
        self.assertEqual(response.status_code, 404)


class WeightEditTest(ApiTestCase):
    def add_weight(self, weight, logged_date):
        response = self.client.post("/api/weights", json={
            "user_id": self.user_id, "weight_kg": weight, "logged_date": logged_date,
        })
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["weight"]

    def edit_weight(self, weight_id, **body):
        return self.client.put(f"/api/weights/{weight_id}", json={"user_id": self.user_id, **body})

    def test_create_returns_the_entry_id(self):
        weight = self.add_weight(79.5, "2026-10-05")
        self.assertIsInstance(weight["id"], int)
        self.assertEqual(weight["is_initial"], 0)

    def test_regular_entry_value_and_date_can_be_edited(self):
        weight = self.add_weight(79.5, "2026-10-05")
        response = self.edit_weight(weight["id"], weight_kg=79.1, logged_date="2026-10-06", note="moved")
        self.assertEqual(response.status_code, 200, response.json)
        history = database.get_weight_history(self.user_id, self.journey_id())
        self.assertEqual([(row["logged_date"], row["weight_kg"]) for row in history],
                         [("2026-10-06", 79.1), ("2026-10-01", 80.0)])

    def test_moving_onto_an_existing_date_is_a_conflict(self):
        first = self.add_weight(79.5, "2026-10-05")
        self.add_weight(79.0, "2026-10-06")
        response = self.edit_weight(first["id"], weight_kg=79.5, logged_date="2026-10-06")
        self.assertEqual(response.status_code, 409)

    def test_starting_weight_value_is_editable_and_moves_the_baseline(self):
        initial = database.get_weight_history(self.user_id, self.journey_id())[0]
        response = self.edit_weight(initial["id"], weight_kg=81.2, logged_date=initial["logged_date"])
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(database.get_active_journey(self.user_id)["initial_weight_kg"], 81.2)
        # Restarting the server must not overwrite the corrected baseline.
        database.init_db()
        self.assertEqual(database.get_active_journey(self.user_id)["initial_weight_kg"], 81.2)
        history = self.client.get(f"/api/weights/history/{self.user_id}").json
        self.assertEqual(history["journey"]["initial_weight_kg"], 81.2)
        self.assertEqual(len(history["history"]), 1)

    def test_starting_weight_date_cannot_change(self):
        initial = database.get_weight_history(self.user_id, self.journey_id())[0]
        response = self.edit_weight(initial["id"], weight_kg=80, logged_date="2026-10-02")
        self.assertEqual(response.status_code, 400)

    def test_other_users_cannot_edit_an_entry(self):
        weight = self.add_weight(79.5, "2026-10-05")
        other_client, other_id = self.login("other@example.com")
        forged = other_client.put(f"/api/weights/{weight['id']}", json={
            "user_id": self.user_id, "weight_kg": 60, "logged_date": "2026-10-05",
        })
        self.assertEqual(forged.status_code, 403)
        own_id = other_client.put(f"/api/weights/{weight['id']}", json={
            "user_id": other_id, "weight_kg": 60, "logged_date": "2026-10-05",
        })
        self.assertEqual(own_id.status_code, 404)

    def test_weight_range_is_enforced(self):
        for value in (5, 900, "NaN", True):
            with self.subTest(value=value):
                response = self.client.post("/api/weights", json={
                    "user_id": self.user_id, "weight_kg": value, "logged_date": "2026-10-05",
                })
                self.assertEqual(response.status_code, 400)


class LogFieldValidationTest(ApiTestCase):
    FOOD = {"food_name": "Rice", "calories": 400, "meal_type": "lunch",
            "logged_date": "2026-10-05", "logged_time": "12:30"}
    EXERCISE = {"exercise_name": "Run", "duration_minutes": 30, "calories_burned": 300,
                "logged_date": "2026-10-05", "logged_time": "07:00"}

    def post(self, path, body):
        return self.client.post(path, json={"user_id": self.user_id, **body})

    def test_bad_food_fields_are_rejected(self):
        cases = [
            {"notes": {"a": 1}}, {"food_name": "x" * 101}, {"food_name": "   "},
            {"calories": "inf"}, {"calories": 20000}, {"protein_g": 5000},
        ]
        for change in cases:
            with self.subTest(change=change):
                self.assertEqual(self.post("/api/foods", {**self.FOOD, **change}).status_code, 400)

    def test_food_text_is_trimmed_and_update_returns_full_row(self):
        created = self.post("/api/foods", {**self.FOOD, "food_name": "  Rice  ", "notes": " "}).json
        self.assertEqual(created["food"]["food_name"], "Rice")
        self.assertIsNone(created["food"]["notes"])
        updated = self.client.put(f"/api/foods/{created['food']['id']}", json={
            "user_id": self.user_id, **self.FOOD, "calories": 450,
        })
        self.assertEqual(updated.status_code, 200, updated.json)
        self.assertEqual(updated.json["food"]["calories"], 450)
        self.assertIn("photo_path", updated.json["food"])

    def test_bad_exercise_fields_are_rejected(self):
        cases = [
            {"category": 5}, {"notes": ["x"]}, {"exercise_name": ""},
            {"duration_minutes": 2000}, {"calories_burned": "inf"},
        ]
        for change in cases:
            with self.subTest(change=change):
                self.assertEqual(self.post("/api/exercises", {**self.EXERCISE, **change}).status_code, 400)

    def test_oversized_photo_gets_a_clear_message(self):
        food_id = self.post("/api/foods", self.FOOD).json["food"]["id"]
        response = self.client.post(f"/api/foods/{food_id}/photo", data={
            "user_id": str(self.user_id),
            "photo": (io.BytesIO(b"0" * (5 * 1024 * 1024 + 10)), "big.png"),
        }, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json["message"], "Photo must not exceed 5 MB")


class LegacyWeightMigrationTest(unittest.TestCase):
    def test_old_weight_table_is_migrated_without_crashing(self):
        original = database.DATABASE_NAME
        with tempfile.TemporaryDirectory() as folder:
            database.DATABASE_NAME = Path(folder) / "legacy.sqlite"
            try:
                database.init_db()
                connection = sqlite3.connect(database.DATABASE_NAME)
                connection.executescript("""
                    INSERT INTO users (username, email, password_hash) VALUES ('old', 'old@example.com', 'x');
                    INSERT INTO plan_journeys (user_id, initial_weight_kg, target_weight_kg, started_at)
                        VALUES (1, 80, 72, '2026-06-01 08:00:00');
                    INSERT INTO user_plans (user_id, journey_id, age, gender, height_cm, current_weight_kg,
                        target_weight_kg, daily_activity_level, strategy, current_bmi, current_bmi_category,
                        target_bmi, target_bmi_category, bmr, activity_multiplier, maintenance_calories,
                        target_calories, daily_deficit, diet_deficit, exercise_deficit,
                        estimated_weight_loss_kg_per_week, recommended_timeline_weeks, timeline_status,
                        protein_g, carbs_g, fat_g, created_at)
                        VALUES (1, 1, 30, 'male', 175, 80, 72, 'mostly_sitting', 'balanced', 26.1,
                        'overweight', 23.5, 'normal', 1700, 1.2, 2040, 1740, 500, 300, 200, 0.45, 18,
                        'not_provided', 96, 180, 48, '2026-06-01 08:00:00');
                    DROP TABLE weight_logs;
                    CREATE TABLE weight_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        weight_kg REAL NOT NULL,
                        logged_date TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (user_id, logged_date)
                    );
                    INSERT INTO weight_logs (user_id, weight_kg, logged_date) VALUES (1, 80, '2026-06-01');
                    INSERT INTO weight_logs (user_id, weight_kg, logged_date) VALUES (1, 79, '2026-06-08');
                """)
                connection.commit()
                connection.close()

                database.init_db()

                rows = database.get_weight_history(1, 1)
                self.assertEqual([(row["logged_date"], row["is_initial"]) for row in rows],
                                 [("2026-06-08", 0), ("2026-06-01", 1)])
            finally:
                database.DATABASE_NAME = original


if __name__ == "__main__":
    unittest.main()
