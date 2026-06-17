import sqlite3

from flask import Flask, request
from flask_cors import CORS
from database import init_db, create_user, get_user_from_email
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)
init_db()
#to create database whenever app runs
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
def generate_plan():
    data = request.get_json() or {}

    age = data.get("age")
    gender = data.get("gender")
    height_cm = data.get("height_cm")
    current_weight_kg = data.get("current_weight_kg")
    target_weight_kg = data.get("target_weight_kg")
    exercise_habit = data.get("exercise_habit")
    strategy = data.get("strategy")
    desired_timeline_weeks = data.get("desired_timeline_weeks")

    if (
        age is None
        or not gender
        or height_cm is None
        or current_weight_kg is None
        or target_weight_kg is None
        or not exercise_habit
        or not strategy
    ):
        return {
            "success": False,
            "message": "Age, gender, height, current weight, target weight, exercise habit, and strategy are required"
        }, 400

    try:
        age = float(age)
        height_cm = float(height_cm)
        current_weight_kg = float(current_weight_kg)
        target_weight_kg = float(target_weight_kg)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Age, height, current weight, and target weight must be numbers"
        }, 400

    if desired_timeline_weeks is not None:
        try:
            desired_timeline_weeks = float(desired_timeline_weeks)
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Desired timeline must be a positive number"
            }, 400

        if desired_timeline_weeks <= 0:
            return {
                "success": False,
                "message": "Desired timeline must be a positive number"
            }, 400

    activity_multipliers = {
        "little_or_no_exercise": 1.2,
        "light_exercise": 1.375,
        "moderate_exercise": 1.55,
        "active_exercise": 1.725,
        "very_active_exercise": 1.9,
    }

    strategy_splits = {
        "diet": (0.8, 0.2),
        "balanced": (0.6, 0.4),
        "exercise": (0.4, 0.6),
    }

    if gender not in ["male", "female"]:
        return {
            "success": False,
            "message": "Invalid gender"
        }, 400

    if exercise_habit not in activity_multipliers:
        return {
            "success": False,
            "message": "Invalid exercise habit"
        }, 400

    if strategy not in strategy_splits:
        return {
            "success": False,
            "message": "Invalid strategy"
        }, 400

    if target_weight_kg >= current_weight_kg:
        return {
            "success": False,
            "message": "Target weight must be lower than current weight for a weight-loss plan"
        }, 400

    height_m = height_cm / 100
    current_bmi = current_weight_kg / (height_m * height_m)
    target_bmi = target_weight_kg / (height_m * height_m)

    if gender == "male":
        bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age + 5
        safety_floor = 1500
    else:
        bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 161
        safety_floor = 1200

    activity_multiplier = activity_multipliers[exercise_habit]
    maintenance_calories = bmr * activity_multiplier
    daily_deficit = 500
    warning = None
    timeline_status = "not_provided"

    if maintenance_calories - daily_deficit < safety_floor:
        daily_deficit = max(maintenance_calories - safety_floor, 0)
        warning = "The deficit was reduced because the target calories would be too low."

    weight_to_lose_kg = current_weight_kg - target_weight_kg
    total_deficit_needed = weight_to_lose_kg * 7700

    if desired_timeline_weeks:
        desired_timeline_days = desired_timeline_weeks * 7
        required_daily_deficit = total_deficit_needed / desired_timeline_days
        requested_target_calories = maintenance_calories - required_daily_deficit

        if required_daily_deficit <= 1000 and requested_target_calories >= safety_floor:
            daily_deficit = required_daily_deficit
            timeline_status = "accepted"
        else:
            timeline_status = "adjusted"
            warning = "Requested timeline is too fast. A safer recommended timeline was returned instead."

    target_calories = maintenance_calories - daily_deficit
    recommended_timeline_weeks = (total_deficit_needed / daily_deficit) / 7 if daily_deficit > 0 else 0
    estimated_weight_loss_kg_per_week = (daily_deficit * 7) / 7700 if daily_deficit > 0 else 0
    diet_ratio, exercise_ratio = strategy_splits[strategy]
    diet_deficit = daily_deficit * diet_ratio
    exercise_deficit = daily_deficit * exercise_ratio
    protein_g = current_weight_kg * 1.2
    fat_g = (target_calories * 0.25) / 9
    carbs_g = (target_calories - protein_g * 4 - fat_g * 9) / 4

    return {
        "success": True,
        "message": "Plan generated successfully",
        "plan": {
            "current_bmi": round(current_bmi, 1),
            "current_bmi_category": get_bmi_category(current_bmi),
            "target_bmi": round(target_bmi, 1),
            "target_bmi_category": get_bmi_category(target_bmi),
            "bmr": round(bmr),
            "activity_multiplier": activity_multiplier,
            "maintenance_calories": round(maintenance_calories),
            "target_calories": round(target_calories),
            "daily_deficit": round(daily_deficit),
            "diet_deficit": round(diet_deficit),
            "exercise_deficit": round(exercise_deficit),
            "estimated_weight_loss_kg_per_week": round(estimated_weight_loss_kg_per_week, 2),
            "desired_timeline_weeks": round(desired_timeline_weeks) if desired_timeline_weeks else None,
            "recommended_timeline_weeks": round(recommended_timeline_weeks),
            "timeline_status": timeline_status,
            "protein_g": round(protein_g),
            "carbs_g": round(max(carbs_g, 0)),
            "fat_g": round(fat_g),
            "strategy": strategy,
            "exercise_habit": exercise_habit,
            "warning": warning
        }
    }

def get_bmi_category(bmi):
    if bmi < 18.5:
        return "underweight"
    if bmi < 25:
        return "normal"
    if bmi < 30:
        return "overweight"
    return "obese"

if __name__ == "__main__":
    app.run(debug=True)
