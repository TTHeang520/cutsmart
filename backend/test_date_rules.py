"""Date rules for logs and the healthy-target suggestion."""
import re
import unittest
from datetime import datetime, timedelta, timezone

from test_api_full import EXERCISE, FOOD, FullApiCase
from test_launch_fixes import PLAN_INPUT


def utc_day(offset):
    return (datetime.now(timezone.utc).date() + timedelta(days=offset)).isoformat()


class FutureDateTest(FullApiCase):
    def test_tomorrow_is_allowed_for_timezones_ahead_of_utc(self):
        response = self.post("/api/weights", {"weight_kg": 79, "logged_date": utc_day(1)})
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual(self.post("/api/foods", {**FOOD, "logged_date": utc_day(1)}).status_code, 200)

    def test_later_dates_are_rejected_everywhere(self):
        later = utc_day(2)
        weight = self.post("/api/weights", {"weight_kg": 79, "logged_date": later})
        self.assertEqual(weight.status_code, 400)
        self.assertEqual(weight.json["message"], "You can't log entries for a future date")
        self.assertEqual(self.post("/api/foods", {**FOOD, "logged_date": later}).status_code, 400)
        self.assertEqual(self.post("/api/exercises", {**EXERCISE, "logged_date": later}).status_code, 400)

        food = self.add_food()
        exercise = self.add_exercise()
        saved = self.post("/api/weights", {"weight_kg": 79, "logged_date": "2026-10-05"}).json["weight"]
        self.assertEqual(self.put(f"/api/foods/{food['id']}", {**FOOD, "logged_date": later}).status_code, 400)
        self.assertEqual(self.put(f"/api/exercises/{exercise['id']}",
                                  {**EXERCISE, "logged_date": later}).status_code, 400)
        self.assertEqual(self.put(f"/api/weights/{saved['id']}",
                                  {"weight_kg": 79, "logged_date": later}).status_code, 400)

    def test_new_journey_cannot_start_in_the_future(self):
        response = self.client.post("/api/plans/save", json={
            "user_id": self.user_id, "mode": "new", "input_data": PLAN_INPUT, "start_date": utc_day(2)})
        self.assertEqual(response.status_code, 400)


class BeforeJourneyStartTest(FullApiCase):
    # The journey in ApiTestCase starts on 2026-10-01.
    def test_weight_before_the_starting_weight_is_rejected(self):
        response = self.post("/api/weights", {"weight_kg": 81, "logged_date": "2026-09-30"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("2026-10-01", response.json["message"])
        self.assertEqual(self.post("/api/weights", {"weight_kg": 80.5, "logged_date": "2026-10-01"}).status_code, 200)

    def test_editing_cannot_move_a_weight_before_the_start(self):
        saved = self.post("/api/weights", {"weight_kg": 79, "logged_date": "2026-10-05"}).json["weight"]
        moved = self.put(f"/api/weights/{saved['id']}", {"weight_kg": 79, "logged_date": "2026-09-01"})
        self.assertEqual(moved.status_code, 400)
        history = self.client.get(f"/api/weights/history/{self.user_id}").json["history"]
        start = next(row for row in history if row["is_initial"])
        # The starting weight itself stays editable on its own date.
        same_day = self.put(f"/api/weights/{start['id']}", {"weight_kg": 80.2, "logged_date": "2026-10-01"})
        self.assertEqual(same_day.status_code, 200, same_day.json)

    def test_food_and_exercise_can_still_be_backdated(self):
        # Logging yesterday's meal on day one of a plan is normal; only weights define the start.
        self.assertEqual(self.post("/api/foods", {**FOOD, "logged_date": "2026-09-30"}).status_code, 200)
        self.assertEqual(self.post("/api/exercises", {**EXERCISE, "logged_date": "2026-09-30"}).status_code, 200)


class HealthyTargetSuggestionTest(unittest.TestCase):
    def test_suggested_target_is_always_accepted(self):
        from app import validate_plan_input

        base = {key: value for key, value in PLAN_INPUT.items() if key != "desired_timeline_weeks"}
        for tenths in range(1000, 2501):
            height = tenths / 10
            _, error = validate_plan_input({**base, "height_cm": height, "current_weight_kg": 300,
                                            "target_weight_kg": 30})
            if error is None:
                # Below about 127 cm, 30 kg (the weight floor) is already a healthy BMI.
                continue
            suggested = float(re.search(r"at least ([\d.]+) kg", error).group(1))
            _, error = validate_plan_input({**base, "height_cm": height, "current_weight_kg": 300,
                                            "target_weight_kg": suggested})
            self.assertIsNone(error, f"height {height}: suggested {suggested} was rejected")


if __name__ == "__main__":
    unittest.main()
