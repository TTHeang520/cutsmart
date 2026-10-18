import unittest

from planner import generate_plan, calculate_macros


class PlanOptionTest(unittest.TestCase):
    def setUp(self):
        self.inputs = {
            "age": 25, "gender": "male", "height_cm": 175,
            "current_weight_kg": 65, "target_weight_kg": 62,
            "daily_activity_level": "light_daily_movement",
            "strategy": "balanced", "desired_timeline_weeks": 1,
        }

    def test_faster_recalculates_complete_plan_and_steady_is_default(self):
        for strategy in ("diet", "balanced", "exercise"):
            with self.subTest(strategy=strategy):
                inputs = {**self.inputs, "strategy": strategy}
                steady = generate_plan(inputs)
                faster = generate_plan({**inputs, "plan_option": "fastest_safe"})
                self.assertEqual(steady["timeline_status"], "adjusted")
                self.assertEqual(faster["timeline_status"], "fastest_safe")
                self.assertGreater(faster["daily_deficit"], steady["daily_deficit"])
                self.assertEqual(faster["daily_deficit"], steady["alternative_plan"]["daily_deficit"])
                self.assertGreaterEqual(faster["target_calories"], 1500)
                self.assertLessEqual(faster["daily_deficit"], 1000)
                self.assertLess(faster["target_calories"], steady["target_calories"])
                self.assertGreater(faster["exercise_deficit"], steady["exercise_deficit"])
                for key, value in calculate_macros(faster["target_calories"], 65).items():
                    self.assertEqual(faster[key], value)
                self.assertEqual(generate_plan({**inputs, "plan_option": "steady"}), steady)

    def test_rejects_unavailable_and_unknown_options(self):
        self.assertIsNone(generate_plan({**self.inputs, "plan_option": "invalid"}))
        self.assertIsNone(generate_plan({**self.inputs, "desired_timeline_weeks": 30,
                                         "plan_option": "fastest_safe"}))
        self.assertIsNone(generate_plan({**self.inputs, "desired_timeline_weeks": None,
                                         "plan_option": "fastest_safe"}))


if __name__ == "__main__":
    unittest.main()
