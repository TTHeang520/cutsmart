import json
import sqlite3

from flask import Flask, request
from flask_cors import CORS
from database import init_db, create_user, get_user_from_email, save_user_plan, get_latest_user_plan
from planner import generate_plan
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)
init_db()


@app.route("/")
def home():
    return "Hello CutSmart"


@app.route("/api/test")
def test():
    return {"message": "Backend is working"}


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return {
            "success": False,
            "message": "Username, email, and password are required"
        }, 400

    password_hash = generate_password_hash(password)

    try:
        create_user(username, email, password_hash)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "Email already registered"
        }, 400

    return {
        "success": True,
        "message": "Registered successfully"
    }


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return {
            "success": False,
            "message": "Email and password are required"
        }, 400

    user = get_user_from_email(email)

    if user is None:
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    stored_password_hash = user[3]

    if not check_password_hash(stored_password_hash, password):
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user[0],
            "username": user[1],
            "email": user[2]
        }
    }


@app.route("/api/plan", methods=["POST"])
def plan():
    data = request.get_json()

    if data is None:
        return {
            "success": False,
            "message": "Request body must be JSON"
        }, 400

    required_fields = [
        "age",
        "gender",
        "height_cm",
        "current_weight_kg",
        "target_weight_kg",
        "daily_activity_level",
        "strategy"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "Age, gender, height, current weight, target weight, daily activity level, and strategy are required"
            }, 400

    if data["gender"] not in ["male", "female"]:
        return {
            "success": False,
            "message": "Invalid gender"
        }, 400

    valid_daily_activity_levels = [
        "mostly_sitting",
        "light_daily_movement",
        "on_feet_often",
        "physical_daily_routine"
    ]

    if data["daily_activity_level"] not in valid_daily_activity_levels:
        return {
            "success": False,
            "message": "Invalid daily activity level"
        }, 400

    if data["strategy"] not in ["diet", "exercise", "balanced"]:
        return {
            "success": False,
            "message": "Invalid strategy"
        }, 400

    number_fields = [
        "age",
        "height_cm",
        "current_weight_kg",
        "target_weight_kg"
    ]

    if "desired_timeline_weeks" in data and data["desired_timeline_weeks"] is not None:
        number_fields.append("desired_timeline_weeks")

    try:
        for field in number_fields:
            data[field] = float(data[field])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Age, height, current weight, target weight, and desired timeline must be numbers"
        }, 400

    if (
        data["age"] <= 0
        or data["height_cm"] <= 0
        or data["current_weight_kg"] <= 0
        or data["target_weight_kg"] <= 0
    ):
        return {
            "success": False,
            "message": "Age, height, current weight, and target weight must be positive numbers"
        }, 400

    if data["target_weight_kg"] >= data["current_weight_kg"]:
        return {
            "success": False,
            "message": "Target weight must be lower than current weight for a weight-loss plan"
        }, 400

    if "desired_timeline_weeks" in data and data["desired_timeline_weeks"] is not None:
        if data["desired_timeline_weeks"] <= 0:
            return {
                "success": False,
                "message": "Desired timeline must be a positive number"
            }, 400

    plan_result = generate_plan(data)

    if plan_result is None:
        return {
            "success": False,
            "message": "Could not generate plan from the provided details"
        }, 400

    return {
        "success": True,
        "message": "Plan generated successfully",
        "plan": plan_result
    }

@app.route("/api/plans/save", methods=["POST"])
def save_plan():
    data = request.get_json()

    if data is None:
        return {
            "success": False,
            "message": "Request body must be JSON"
        }, 400

    user_id = data.get("user_id")
    input_data = data.get("input_data")
    plan_result = data.get("plan_result")

    if not user_id or not input_data or not plan_result:
        return {
            "success": False,
            "message": "User id, input data, and plan result are required"
        }, 400

    required_input_fields = [
        "age",
        "gender",
        "height_cm",
        "current_weight_kg",
        "target_weight_kg",
        "daily_activity_level",
        "strategy"
    ]

    required_plan_fields = [
        "current_bmi",
        "current_bmi_category",
        "target_bmi",
        "target_bmi_category",
        "bmr",
        "activity_multiplier",
        "maintenance_calories",
        "target_calories",
        "daily_deficit",
        "diet_deficit",
        "exercise_deficit",
        "estimated_weight_loss_kg_per_week",
        "recommended_timeline_weeks",
        "timeline_status",
        "protein_g",
        "carbs_g",
        "fat_g"
    ]

    for field in required_input_fields:
        if field not in input_data or input_data[field] in ("", None):
            return {
                "success": False,
                "message": "Input data is missing required fields"
            }, 400

    for field in required_plan_fields:
        if field not in plan_result or plan_result[field] in ("", None):
            return {
                "success": False,
                "message": "Plan result is missing required fields"
            }, 400

    save_user_plan(user_id, input_data, plan_result)

    return {
        "success": True,
        "message": "Plan saved successfully"
    }


@app.route("/api/plans/latest/<int:user_id>", methods=["GET"])
def latest_plan(user_id):
    plan = get_latest_user_plan(user_id)

    if plan is None:
        return {
            "success": False,
            "message": "No saved plan found"
        }, 404

    plan_data = dict(plan)

    if plan_data["alternative_plan"] is not None:
        plan_data["alternative_plan"] = json.loads(plan_data["alternative_plan"])

    return {
        "success": True,
        "message": "Latest plan fetched successfully",
        "plan": plan_data
    }


if __name__ == "__main__":
    app.run(debug=True)
