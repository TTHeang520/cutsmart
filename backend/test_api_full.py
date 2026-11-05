"""End-to-end API coverage: every route, the happy path, bad input and cross-account access."""
import io
import itertools
import unittest

from PIL import Image

import database
from planner import generate_plan
from test_launch_fixes import ApiTestCase, PLAN_INPUT

FOOD = {"food_name": "Chicken rice", "calories": 600, "meal_type": "lunch",
        "logged_date": "2026-10-05", "logged_time": "12:30"}
EXERCISE = {"exercise_name": "Run", "category": "cardio", "duration_minutes": 30,
            "calories_burned": 300, "logged_date": "2026-10-05", "logged_time": "07:00"}


def png_bytes(color="red"):
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buffer, "PNG")
    buffer.seek(0)
    return buffer


class FullApiCase(ApiTestCase):
    def post(self, path, body=None, client=None, user_id=None):
        client = client or self.client
        return client.post(path, json={"user_id": user_id or self.user_id, **(body or {})})

    def put(self, path, body=None, client=None, user_id=None):
        client = client or self.client
        return client.put(path, json={"user_id": user_id or self.user_id, **(body or {})})

    def delete(self, path, client=None, user_id=None):
        client = client or self.client
        return client.delete(path, json={"user_id": user_id or self.user_id})

    def add_food(self, **change):
        response = self.post("/api/foods", {**FOOD, **change})
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["food"]

    def add_exercise(self, **change):
        response = self.post("/api/exercises", {**EXERCISE, **change})
        self.assertEqual(response.status_code, 200, response.json)
        return response.json["exercise"]

    def upload_photo(self, food_id, data=None, filename="meal.png", client=None, user_id=None):
        client = client or self.client
        return client.post(f"/api/foods/{food_id}/photo", data={
            "user_id": str(user_id or self.user_id),
            "photo": (data or png_bytes(), filename),
        }, content_type="multipart/form-data")


class AuthFlowTest(FullApiCase):
    def test_session_logout_and_relogin(self):
        session = self.client.get("/api/session")
        self.assertEqual(session.status_code, 200)
        self.assertEqual(session.json["user_id"], self.user_id)
        self.assertEqual(self.client.post("/api/logout").status_code, 200)
        self.assertEqual(self.client.get("/api/session").status_code, 401)
        self.assertEqual(self.client.get(f"/api/plans/latest/{self.user_id}").status_code, 401)

    def test_two_devices_have_independent_sessions(self):
        phone = self.api.app.test_client()
        phone.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
        login = phone.post("/api/login", json={
            "email": "LAUNCH@example.com ", "password": "test-password"}).json
        self.assertTrue(login["success"])
        phone.environ_base["HTTP_X_CSRF_TOKEN"] = login["csrf_token"]
        self.assertEqual(phone.post("/api/logout").status_code, 200)
        # Logging out on the phone must not log the laptop out.
        self.assertEqual(self.client.get("/api/session").status_code, 200)

    def test_bad_logins_and_registrations(self):
        anon = self.api.app.test_client()
        anon.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
        self.assertEqual(anon.post("/api/login", json={
            "email": "launch@example.com", "password": "wrong-password"}).status_code, 401)
        self.assertEqual(anon.post("/api/login", json={
            "email": "nobody@example.com", "password": "test-password"}).status_code, 401)
        self.assertEqual(anon.post("/api/login", json={"email": "", "password": ""}).status_code, 400)
        self.assertEqual(anon.post("/api/login", json=["x"]).status_code, 400)
        duplicate = anon.post("/api/register", json={
            "username": "dup", "email": "Launch@Example.com", "password": "another-password"})
        self.assertEqual(duplicate.status_code, 400)
        long_name = anon.post("/api/register", json={
            "username": "x" * 31, "email": "long@example.com", "password": "another-password"})
        self.assertEqual(long_name.status_code, 400)

    def test_writes_need_csrf_and_custom_header(self):
        no_csrf = self.api.app.test_client()
        no_csrf.environ_base["HTTP_X_CUTSMART_REQUEST"] = "1"
        no_csrf.set_cookie("cutsmart_session", self.client.get_cookie("cutsmart_session").value)
        self.assertEqual(self.post("/api/foods", FOOD, client=no_csrf).status_code, 403)
        no_header = self.api.app.test_client()
        no_header.set_cookie("cutsmart_session", self.client.get_cookie("cutsmart_session").value)
        self.assertEqual(no_header.post("/api/logout").status_code, 403)

    def test_health_check_and_unknown_api_route(self):
        anon = self.api.app.test_client()
        self.assertEqual(anon.get("/api/test").status_code, 200)
        unknown = self.client.get("/api/does-not-exist")
        self.assertEqual(unknown.status_code, 404)
        self.assertFalse(unknown.json["success"])


class PlannerPropertyTest(unittest.TestCase):
    """The planner must stay inside its own safety rules for every accepted input."""

    def test_plans_respect_calorie_floor_and_sane_macros(self):
        combos = itertools.product(
            ["male", "female"], [18, 45, 80], [150, 175, 200], [60, 95, 160],
            ["mostly_sitting", "physical_daily_routine"], ["diet", "balanced", "exercise"],
            [None, 4, 30],
        )
        checked = 0
        for gender, age, height, weight, activity, strategy, weeks in combos:
            target = max(weight - 10, 18.5 * (height / 100) ** 2 + 0.5)
            if target >= weight:
                continue
            plan = generate_plan({
                "gender": gender, "age": age, "height_cm": height,
                "current_weight_kg": weight, "target_weight_kg": target,
                "daily_activity_level": activity, "strategy": strategy,
                "desired_timeline_weeks": weeks,
            })
            if plan is None:
                continue
            checked += 1
            floor = 1500 if gender == "male" else 1200
            with self.subTest(gender=gender, age=age, height=height, weight=weight,
                              activity=activity, strategy=strategy, weeks=weeks):
                self.assertGreaterEqual(plan["target_calories"], floor - 1)
                self.assertGreater(plan["daily_deficit"], 0)
                self.assertLessEqual(plan["daily_deficit"], 1000)
                self.assertAlmostEqual(plan["diet_deficit"] + plan["exercise_deficit"],
                                       plan["daily_deficit"], delta=1)
                for macro in ("protein_g", "carbs_g", "fat_g"):
                    self.assertGreaterEqual(plan[macro], 0)
                self.assertGreaterEqual(plan["recommended_timeline_weeks"], 1)
        self.assertGreater(checked, 100)


class PlanEndpointTest(FullApiCase):
    def test_every_strategy_and_activity_level_generates(self):
        for strategy, activity in itertools.product(
                ["diet", "balanced", "exercise"],
                ["mostly_sitting", "light_daily_movement", "on_feet_often", "physical_daily_routine"]):
            with self.subTest(strategy=strategy, activity=activity):
                response = self.client.post("/api/plan", json={
                    **PLAN_INPUT, "strategy": strategy, "daily_activity_level": activity})
                self.assertEqual(response.status_code, 200, response.json)
                self.assertEqual(response.json["plan"]["strategy"], strategy)

    def test_small_weight_loss_has_at_least_one_week(self):
        response = self.client.post("/api/plan", json={
            **PLAN_INPUT, "target_weight_kg": 79.9, "desired_timeline_weeks": None})
        self.assertEqual(response.status_code, 200, response.json)
        self.assertGreaterEqual(response.json["plan"]["recommended_timeline_weeks"], 1)

    def test_no_safe_deficit_gives_a_clear_message(self):
        response = self.client.post("/api/plan", json={
            "age": 100, "gender": "female", "height_cm": 150, "current_weight_kg": 45,
            "target_weight_kg": 42, "daily_activity_level": "mostly_sitting", "strategy": "balanced",
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("safe", response.json["message"].lower())

    def test_invalid_choices_are_rejected(self):
        for change in ({"gender": "other"}, {"strategy": "fast"},
                       {"daily_activity_level": "athlete"}, {"plan_option": "turbo"},
                       {"target_weight_kg": 80}):
            with self.subTest(change=change):
                self.assertEqual(self.client.post("/api/plan", json={**PLAN_INPUT, **change}).status_code, 400)
        unavailable = self.client.post("/api/plan", json={
            **PLAN_INPUT, "desired_timeline_weeks": None, "plan_option": "fastest_safe"})
        self.assertEqual(unavailable.json["message"], "A faster option is not available for this plan")

    def test_numeric_strings_are_accepted(self):
        response = self.client.post("/api/plan", json={
            **PLAN_INPUT, "age": "30", "height_cm": "175.5", "desired_timeline_weeks": ""})
        self.assertEqual(response.status_code, 200, response.json)


class JourneyTest(FullApiCase):
    def test_update_keeps_journey_and_new_archives_it(self):
        first = self.journey_id()
        self.add_food()
        self.save_plan({**PLAN_INPUT, "current_weight_kg": 78})
        self.assertEqual(self.journey_id(), first)
        self.assertEqual(database.get_active_journey(self.user_id)["initial_weight_kg"], 80)
        saved = self.save_plan(PLAN_INPUT, mode="new", start_date="2026-11-01")
        self.assertNotEqual(saved["journey_id"], first)
        journeys = self.client.get(f"/api/journeys/history/{self.user_id}").json["journeys"]
        self.assertEqual([j["status"] for j in journeys], ["active", "archived"])
        plans = self.client.get(f"/api/users/{self.user_id}/journeys/{first}/plans").json["plans"]
        self.assertEqual(len(plans), 2)
        foods = self.client.get(f"/api/users/{self.user_id}/journeys/{first}/foods").json["foods"]
        self.assertEqual(len(foods), 1)
        # The new journey starts empty for logging pages.
        today = self.client.get(f"/api/foods/{self.user_id}?date=2026-10-05").json
        self.assertEqual(today["foods"], [])

    def test_archived_logs_cannot_be_changed(self):
        food = self.add_food()
        exercise = self.add_exercise()
        self.save_plan(PLAN_INPUT, mode="new")
        self.assertEqual(self.put(f"/api/foods/{food['id']}", FOOD).status_code, 404)
        self.assertEqual(self.delete(f"/api/foods/{food['id']}").status_code, 404)
        self.assertEqual(self.put(f"/api/exercises/{exercise['id']}", EXERCISE).status_code, 404)
        self.assertEqual(self.delete(f"/api/exercises/{exercise['id']}").status_code, 404)
        self.assertEqual(self.upload_photo(food["id"]).status_code, 404)

    def test_latest_plan_and_missing_plan(self):
        latest = self.client.get(f"/api/plans/latest/{self.user_id}")
        self.assertEqual(latest.status_code, 200)
        self.assertEqual(latest.json["plan"]["strategy"], "balanced")
        other, other_id = self.login("noplan@example.com")
        self.assertEqual(other.get(f"/api/plans/latest/{other_id}").status_code, 404)
        self.assertEqual(other.get(f"/api/weights/history/{other_id}").status_code, 404)
        self.assertEqual(self.post("/api/foods", FOOD, client=other, user_id=other_id).status_code, 404)
        self.assertEqual(other.get(f"/api/journeys/history/{other_id}").json["journeys"], [])

    def test_save_rejects_bad_mode_and_date(self):
        for change in ({"mode": "replace"}, {"start_date": "2026-13-01"}, {"start_date": "1/2/2026"}):
            with self.subTest(change=change):
                response = self.client.post("/api/plans/save", json={
                    "user_id": self.user_id, "input_data": PLAN_INPUT, **change})
                self.assertEqual(response.status_code, 400)


class FoodTest(FullApiCase):
    def test_create_read_update_delete(self):
        food = self.add_food(protein_g="30.5", notes="  extra chilli ")
        self.assertEqual(food["notes"], "extra chilli")
        self.add_food(food_name="Kopi", calories=120, meal_type="breakfast", logged_time="08:00")
        day = self.client.get(f"/api/foods/{self.user_id}?date=2026-10-05").json
        self.assertEqual([f["food_name"] for f in day["foods"]], ["Kopi", "Chicken rice"])
        self.assertEqual(day["summary"], {"entry_count": 2, "total_calories": 720})
        updated = self.put(f"/api/foods/{food['id']}", {**FOOD, "calories": 650, "logged_date": "2026-10-06"})
        self.assertEqual(updated.status_code, 200, updated.json)
        self.assertEqual(updated.json["food"]["logged_date"], "2026-10-06")
        history = self.client.get(f"/api/foods/history/{self.user_id}").json["history"]
        self.assertEqual(history[0]["calories"], 650)
        self.assertEqual(self.delete(f"/api/foods/{food['id']}").status_code, 200)
        self.assertEqual(self.delete(f"/api/foods/{food['id']}").status_code, 404)

    def test_bad_values(self):
        for change in ({"meal_type": "brunch"}, {"logged_time": "7:00"}, {"logged_time": "25:00"},
                       {"logged_date": "2026-02-30"}, {"calories": 0}, {"calories": "abc"},
                       {"protein_g": -1}, {"food_name": None}):
            with self.subTest(change=change):
                self.assertEqual(self.post("/api/foods", {**FOOD, **change}).status_code, 400)
        self.assertEqual(self.client.get(f"/api/foods/{self.user_id}").status_code, 400)
        self.assertEqual(self.client.get(f"/api/foods/{self.user_id}?date=05-10-2026").status_code, 400)

    def test_other_account_cannot_touch_food(self):
        food = self.add_food()
        other, other_id = self.login("food-other@example.com")
        other.post("/api/plans/save", json={"user_id": other_id, "input_data": PLAN_INPUT})
        self.assertEqual(self.put(f"/api/foods/{food['id']}", FOOD, client=other, user_id=other_id).status_code, 404)
        self.assertEqual(self.delete(f"/api/foods/{food['id']}", client=other, user_id=other_id).status_code, 404)
        self.assertEqual(other.get(f"/api/foods/{self.user_id}?date=2026-10-05").status_code, 403)
        self.assertEqual(self.put(f"/api/foods/{food['id']}", FOOD, client=other).status_code, 403)


class PhotoTest(FullApiCase):
    def test_upload_view_replace_and_delete(self):
        food = self.add_food()
        first = self.upload_photo(food["id"])
        self.assertEqual(first.status_code, 200, first.json)
        first_file = self.photos / first.json["photo_path"].split("/")[-1]
        self.assertTrue(first_file.exists())
        shown = self.client.get(first.json["photo_url"])
        self.assertEqual(shown.status_code, 200)
        self.assertEqual(shown.mimetype, "image/webp")
        shown.close()
        second = self.upload_photo(food["id"], png_bytes("blue"), "meal.PNG")
        self.assertEqual(second.status_code, 200, second.json)
        self.assertFalse(first_file.exists())
        self.assertEqual(self.client.get(first.json["photo_url"]).status_code, 404)
        removed = self.client.delete(f"/api/foods/{food['id']}/photo", json={"user_id": self.user_id})
        self.assertEqual(removed.status_code, 200)
        self.assertEqual(list(self.photos.iterdir()), [])
        again = self.client.delete(f"/api/foods/{food['id']}/photo", json={"user_id": self.user_id})
        self.assertEqual(again.status_code, 404)

    def test_photos_are_shrunk_rotated_and_stripped_of_location(self):
        food = self.add_food()
        exif = Image.Exif()
        exif[0x0112] = 6  # Orientation: the camera was rotated 90 degrees.
        exif[0x8825] = {2: (1.0, 2.0, 3.0)}  # GPS block, as phones add.
        big = io.BytesIO()
        Image.new("RGB", (4000, 3000), "green").save(big, "JPEG", quality=95, exif=exif)
        response = self.upload_photo(food["id"], io.BytesIO(big.getvalue()), "IMG_0001.JPG")
        self.assertEqual(response.status_code, 200, response.json)
        self.assertTrue(response.json["photo_path"].endswith(".webp"))
        stored = self.photos / response.json["photo_path"].split("/")[-1]
        with Image.open(stored) as saved:
            self.assertEqual(saved.format, "WEBP")
            # Rotated upright (portrait) and no side longer than 1280 px.
            self.assertEqual(saved.size, (960, 1280))
            self.assertEqual(len(saved.getexif()), 0)
        self.assertLess(stored.stat().st_size, len(big.getvalue()))

    def test_transparent_png_keeps_working(self):
        food = self.add_food()
        image = io.BytesIO()
        Image.new("RGBA", (20, 20), (255, 0, 0, 0)).save(image, "PNG")
        image.seek(0)
        self.assertEqual(self.upload_photo(food["id"], image, "sticker.png").status_code, 200)
        palette = io.BytesIO()
        Image.new("P", (20, 20)).save(palette, "PNG", transparency=0)
        palette.seek(0)
        self.assertEqual(self.upload_photo(food["id"], palette, "palette.png").status_code, 200)

    def test_rejects_fake_and_unsupported_images(self):
        food = self.add_food()
        fake = self.upload_photo(food["id"], io.BytesIO(b"not really an image"), "meal.png")
        self.assertEqual(fake.status_code, 400)
        gif = io.BytesIO()
        Image.new("RGB", (4, 4)).save(gif, "GIF")
        gif_bytes = gif.getvalue()
        self.assertEqual(self.upload_photo(food["id"], io.BytesIO(gif_bytes), "meal.gif").status_code, 400)
        # A GIF renamed to .png is caught by checking the real image content.
        self.assertEqual(self.upload_photo(food["id"], io.BytesIO(gif_bytes), "meal.png").status_code, 400)
        self.assertEqual(list(self.photos.iterdir()), [])

    def test_other_account_cannot_see_or_change_photos(self):
        food = self.add_food()
        url = self.upload_photo(food["id"]).json["photo_url"]
        other, other_id = self.login("photo-other@example.com")
        self.assertEqual(other.get(url).status_code, 404)
        self.assertEqual(self.upload_photo(food["id"], client=other, user_id=other_id).status_code, 404)
        self.assertEqual(self.api.app.test_client().get(url).status_code, 401)

    def test_path_tricks_are_refused(self):
        for path in ("../cutsmart_database", "food_photos/../../launch.sqlite", "%2e%2e/launch.sqlite"):
            with self.subTest(path=path):
                self.assertIn(self.client.get(f"/api/uploads/{path}").status_code, (404,))


class ExerciseTest(FullApiCase):
    def test_create_read_update_delete(self):
        exercise = self.add_exercise()
        self.add_exercise(exercise_name="Gym", category="strength", duration_minutes=45,
                          calories_burned=250, logged_time="18:00")
        day = self.client.get(f"/api/exercises/{self.user_id}?date=2026-10-05").json
        self.assertEqual(day["summary"], {"entry_count": 2, "total_duration_minutes": 75,
                                          "total_calories_burned": 550})
        updated = self.put(f"/api/exercises/{exercise['id']}", {**EXERCISE, "category": "cycling"})
        self.assertEqual(updated.status_code, 200, updated.json)
        history = self.client.get(f"/api/exercises/history/{self.user_id}").json["history"]
        self.assertEqual({row["category"] for row in history}, {"cycling", "strength"})
        self.assertEqual(self.delete(f"/api/exercises/{exercise['id']}").status_code, 200)
        self.assertEqual(len(self.client.get(f"/api/exercises/history/{self.user_id}").json["history"]), 1)

    def test_other_account_cannot_touch_exercise(self):
        exercise = self.add_exercise()
        other, other_id = self.login("ex-other@example.com")
        other.post("/api/plans/save", json={"user_id": other_id, "input_data": PLAN_INPUT})
        self.assertEqual(self.put(f"/api/exercises/{exercise['id']}", EXERCISE,
                                  client=other, user_id=other_id).status_code, 404)
        self.assertEqual(self.delete(f"/api/exercises/{exercise['id']}",
                                     client=other, user_id=other_id).status_code, 404)


class WeightAndActivityTest(FullApiCase):
    def test_weight_routes(self):
        self.post("/api/weights", {"weight_kg": 79.4, "logged_date": "2026-10-03"})
        self.post("/api/weights", {"weight_kg": 79.0, "logged_date": "2026-10-03"})
        latest = self.client.get(f"/api/weights/latest/{self.user_id}").json["latest"]
        self.assertEqual((latest["logged_date"], latest["weight_kg"]), ("2026-10-03", 79.0))
        by_date = self.client.get(f"/api/weights/{self.user_id}?date=2026-10-03")
        self.assertEqual(by_date.json["weight"]["weight_kg"], 79.0)
        self.assertEqual(self.client.get(f"/api/weights/{self.user_id}?date=2026-10-04").status_code, 404)
        history = self.client.get(f"/api/weights/history/{self.user_id}").json["history"]
        self.assertEqual(len(history), 2)
        initial = next(row for row in history if row["is_initial"])
        self.assertEqual(self.delete(f"/api/weights/{initial['id']}").status_code, 400)

    def test_activity_summary(self):
        self.add_food()
        self.add_exercise()
        self.post("/api/weights", {"weight_kg": 79.4, "logged_date": "2026-10-05"})
        days = self.client.get(
            f"/api/activity/{self.user_id}?start=2026-10-01&end=2026-10-07").json["days"]
        # The automatic starting weight (2026-10-01) does not count as activity.
        self.assertEqual(len(days), 1)
        self.assertEqual(days[0]["date"], "2026-10-05")
        self.assertEqual(days[0]["calories_eaten"], 600)
        self.assertEqual(days[0]["calories_burned"], 300)
        self.assertTrue(days[0]["weight_logged"])
        for query in ("start=2026-10-07&end=2026-10-01", "start=2025-01-01&end=2026-10-01", "start=x&end=y"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f"/api/activity/{self.user_id}?{query}").status_code, 400)

    def test_every_user_route_refuses_another_users_id(self):
        other, _ = self.login("snoop@example.com")
        journey = self.journey_id()
        for path in (
            f"/api/plans/latest/{self.user_id}",
            f"/api/journeys/history/{self.user_id}",
            f"/api/users/{self.user_id}/journeys/{journey}/plans",
            f"/api/users/{self.user_id}/journeys/{journey}/weights",
            f"/api/users/{self.user_id}/journeys/{journey}/foods",
            f"/api/users/{self.user_id}/journeys/{journey}/exercises",
            f"/api/weights/history/{self.user_id}",
            f"/api/weights/latest/{self.user_id}",
            f"/api/weights/{self.user_id}?date=2026-10-01",
            f"/api/foods/history/{self.user_id}",
            f"/api/foods/{self.user_id}?date=2026-10-01",
            f"/api/exercises/history/{self.user_id}",
            f"/api/exercises/{self.user_id}?date=2026-10-01",
            f"/api/activity/{self.user_id}?start=2026-10-01&end=2026-10-02",
        ):
            with self.subTest(path=path):
                self.assertEqual(other.get(path).status_code, 403)


if __name__ == "__main__":
    unittest.main()
