import json
import sqlite3
from datetime import date, time

from flask import Flask, request
from flask_cors import CORS
from database import init_db, create_user, get_user_from_email, save_user_plan, get_latest_user_plan, save_weight_log, get_weight_history, get_weight_by_date, get_latest_weight, save_food_log, get_food_history, get_food_logs_by_date
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

@app.route("/api/weights", methods=["POST"])
def create_weight_log():
    data = request.get_json()

    if data is None:
        return {
            "success": False,
            "message": "Request body must be JSON"
        }, 400
    
    user_id = data.get("user_id")
    weight_kg = data.get("weight_kg")
    logged_date = data.get("logged_date")

    if user_id in ("", None) or weight_kg in ("", None) or not logged_date:
        return {
            "success": False,
            "message": "User id, weight, and logged date are required"
        }, 400

    try:
        user_id = int(user_id)
        weight_kg = float(weight_kg)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id and weight must be numbers"
        }, 400

    if user_id <= 0 or weight_kg <= 0:
        return {
            "success": False,
            "message": "User id and weight must be positive"
        }, 400

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != logged_date:
        return {
            "success": False,
            "message": "Logged date must use YYYY-MM-DD format"
        }, 400

    try:
        save_weight_log(user_id, weight_kg, logged_date)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    return {
        "success": True,
        "message": "Weight recorded successfully",
        "weight": {
            "user_id": user_id,
            "weight_kg": weight_kg,
            "logged_date": logged_date
        }
    }

@app.route("/api/weights/history/<int:user_id>", methods=["GET"])
def weight_history(user_id):
    history = get_weight_history(user_id)
    
    return {
        "success": True,
        "message": "Weight history fetched successfully",
        "history": [dict(row) for row in history]
    }

@app.route("/api/weights/latest/<int:user_id>", methods=["GET"])
def latest_weight(user_id):
    latest = get_latest_weight(user_id)

    if latest is None:
        return {
            "success": False,
            "message": "No weight found"
        }, 404
    
    return {
        "success": True,
        "message": "Latest weight fetched successfully",
        "latest": dict(latest)
    }

@app.route("/api/weights/<int:user_id>", methods=["GET"])
def weight_by_date(user_id):
    logged_date = request.args.get("date")

    if not logged_date:
        return {
            "success": False,
            "message": "Date query parameter is required"
        }, 400

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != logged_date:
        return {
            "success": False,
            "message": "Date must use YYYY-MM-DD format"
        }, 400

    weight = get_weight_by_date(user_id, logged_date)

    if weight is None:
        return {
            "success": False,
            "message": "No weight found for this date"
        }, 404

    return {
        "success": True,
        "message": "Weight fetched successfully",
        "date": logged_date,
        "weight": dict(weight)
    }

@app.route("/api/foods", methods=["POST"])
def create_food_log():
    data = request.get_json()

    if data is None:
        return {
            "success": False,
            "message": "Request body must be JSON"
        }, 400

    required_fields = [
        "user_id",
        "food_name",
        "calories",
        "meal_type",
        "logged_date",
        "logged_time"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "User id, food name, calories, meal type, date, and time are required"
            }, 400

    try:
        user_id = int(data["user_id"])
        data["calories"] = float(data["calories"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id and calories must be numbers"
        }, 400

    if user_id <= 0 or data["calories"] <= 0:
        return {
            "success": False,
            "message": "User id and calories must be positive"
        }, 400

    valid_meal_types = [
        "breakfast",
        "lunch",
        "dinner",
        "snack"
    ]

    if data["meal_type"] not in valid_meal_types:
        return {
            "success": False,
            "message": "Invalid meal type"
        }, 400

    try:
        parsed_date = date.fromisoformat(data["logged_date"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != data["logged_date"]:
        return {
            "success": False,
            "message": "Logged date must use YYYY-MM-DD format"
        }, 400

    try:
        parsed_time = time.fromisoformat(data["logged_time"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged time must be a real time in HH:MM format"
        }, 400

    if parsed_time.strftime("%H:%M") != data["logged_time"]:
        return {
            "success": False,
            "message": "Logged time must use HH:MM format"
        }, 400

    optional_macros = ["protein_g", "carbs_g", "fat_g"]

    try:
        for field in optional_macros:
            if data.get(field) in ("", None):
                data[field] = None
            else:
                data[field] = float(data[field])

                if data[field] < 0:
                    return {
                        "success": False,
                        "message": "Macro values cannot be negative"
                    }, 400
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Macro values must be numbers"
        }, 400

    data["photo_path"] = None

    try:
        save_food_log(user_id, data)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    return {
        "success": True,
        "message": "Food recorded successfully",
        "food": {
            "user_id": user_id,
            "food_name": data["food_name"],
            "calories": data["calories"],
            "meal_type": data["meal_type"],
            "logged_date": data["logged_date"],
            "logged_time": data["logged_time"],
            "protein_g": data.get("protein_g"),
            "carbs_g": data.get("carbs_g"),
            "fat_g": data.get("fat_g"),
            "notes": data.get("notes"),
            "photo_path": None
        }
    }

@app.route("/api/foods/history/<int:user_id>", methods=["GET"])
def food_history(user_id):
    history = get_food_history(user_id)

    return {
        "success": True,
        "message": "Food history fetched successfully",
        "history": [dict(row) for row in history]
    }

@app.route("/api/foods/<int:user_id>", methods=["GET"])
def foods_by_date(user_id):
    logged_date = request.args.get("date")

    if not logged_date:
        return {
            "success": False,
            "message": "Date query parameter is required"
        }, 400

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != logged_date:
        return {
            "success": False,
            "message": "Date must use YYYY-MM-DD format"
        }, 400

    food_logs = get_food_logs_by_date(user_id, logged_date)

    return {
        "success": True,
        "message": "Food logs fetched successfully",
        "date": logged_date,
        "foods": [dict(row) for row in food_logs]
    }

if __name__ == "__main__":
    app.run(debug=True)
