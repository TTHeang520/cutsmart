import json
import sqlite3
from pathlib import Path

DATABASE_NAME = Path(__file__).resolve().parent / "cutsmart_database"

def get_db_connection():
    connection = sqlite3.connect(DATABASE_NAME)
    return connection

def init_db():
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )
    """)  

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            age REAL NOT NULL,
            gender TEXT NOT NULL,
            height_cm REAL NOT NULL,
            current_weight_kg REAL NOT NULL,
            target_weight_kg REAL NOT NULL,
            exercise_habit TEXT NOT NULL,
            strategy TEXT NOT NULL,
            desired_timeline_weeks REAL,
            current_bmi REAL NOT NULL,
            current_bmi_category TEXT NOT NULL,
            target_bmi REAL NOT NULL,
            target_bmi_category TEXT NOT NULL,
            bmr REAL NOT NULL,
            activity_multiplier REAL NOT NULL,
            maintenance_calories REAL NOT NULL,
            target_calories REAL NOT NULL,
            daily_deficit REAL NOT NULL,
            diet_deficit REAL NOT NULL,
            exercise_deficit REAL NOT NULL,
            estimated_weight_loss_kg_per_week REAL NOT NULL,
            recommended_timeline_weeks REAL NOT NULL,
            timeline_status TEXT NOT NULL,
            protein_g REAL NOT NULL,
            carbs_g REAL NOT NULL,
            fat_g REAL NOT NULL,
            alternative_plan TEXT,
            warning TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    connection.commit()
    connection.close()

def create_user(username, email, password_hash):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        (username, email, password_hash)
    )

    connection.commit()
    connection.close()

def get_user_from_email(email):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        "SELECT id, username, email, password_hash FROM users WHERE email = ?",
        (email,)
    )

    user = cursor.fetchone()
    connection.close()

    return user

def save_user_plan(user_id, input_data, plan_result):
    connection = get_db_connection()
    cursor = connection.cursor()

    alternative_plan_json = json.dumps(plan_result.get("alternative_plan"))

    cursor.execute(
        """
        INSERT INTO user_plans (
            user_id,
            age,
            gender,
            height_cm,
            current_weight_kg,
            target_weight_kg,
            exercise_habit,
            strategy,
            desired_timeline_weeks,
            current_bmi,
            current_bmi_category,
            target_bmi,
            target_bmi_category,
            bmr,
            activity_multiplier,
            maintenance_calories,
            target_calories,
            daily_deficit,
            diet_deficit,
            exercise_deficit,
            estimated_weight_loss_kg_per_week,
            recommended_timeline_weeks,
            timeline_status,
            protein_g,
            carbs_g,
            fat_g,
            alternative_plan,
            warning
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?
        )
        """,
        (
            user_id,
            input_data["age"],
            input_data["gender"],
            input_data["height_cm"],
            input_data["current_weight_kg"],
            input_data["target_weight_kg"],
            input_data["exercise_habit"],
            input_data["strategy"],
            input_data.get("desired_timeline_weeks"),
            plan_result["current_bmi"],
            plan_result["current_bmi_category"],
            plan_result["target_bmi"],
            plan_result["target_bmi_category"],
            plan_result["bmr"],
            plan_result["activity_multiplier"],
            plan_result["maintenance_calories"],
            plan_result["target_calories"],
            plan_result["daily_deficit"],
            plan_result["diet_deficit"],
            plan_result["exercise_deficit"],
            plan_result["estimated_weight_loss_kg_per_week"],
            plan_result["recommended_timeline_weeks"],
            plan_result["timeline_status"],
            plan_result["protein_g"],
            plan_result["carbs_g"],
            plan_result["fat_g"],
            alternative_plan_json,
            plan_result.get("warning")
        )
    )

    connection.commit()
    connection.close()

def get_latest_user_plan(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM user_plans
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user_id,)
    )

    plan = cursor.fetchone()
    connection.close()

    return plan
