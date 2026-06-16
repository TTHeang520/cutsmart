import sqlite3

from flask import Flask, request
from flask_cors import CORS
from database import init_db, create_user, get_user_from_email
from planner import generate_plan
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
        "exercise_habit",
        "strategy"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "Age, gender, height, current weight, target weight, exercise habit, and strategy are required"
            }, 400

    if data["gender"] not in ["male", "female"]:
        return {
            "success": False,
            "message": "Invalid gender"
        }, 400

    valid_exercise_habits = [
        "little_or_no_exercise",
        "light_exercise",
        "moderate_exercise",
        "active_exercise",
        "very_active_exercise"
    ]

    if data["exercise_habit"] not in valid_exercise_habits:
        return {
            "success": False,
            "message": "Invalid exercise habit"
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

    if data["age"] <= 0 or data["height_cm"] <= 0 or data["current_weight_kg"] <= 0 or data["target_weight_kg"] <= 0:
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

if __name__ == "__main__":
    app.run(debug=True)
