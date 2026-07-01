import json
import sqlite3
from pathlib import Path

DATABASE_NAME = Path(__file__).resolve().parent / "cutsmart_database"

def get_db_connection():
    connection = sqlite3.connect(DATABASE_NAME)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
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
            daily_activity_level TEXT NOT NULL,
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

    columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(user_plans)").fetchall()
    }
    if "exercise_habit" in columns and "daily_activity_level" not in columns:
        cursor.execute(
            "ALTER TABLE user_plans RENAME COLUMN exercise_habit TO daily_activity_level"
        )

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weight_kg REAL NOT NULL,
        logged_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE (user_id, logged_date)
    )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        food_name TEXT NOT NULL,
        calories REAL NOT NULL,
        meal_type TEXT NOT NULL,
        logged_date TEXT NOT NULL,
        logged_time TEXT NOT NULL,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        notes TEXT,
        photo_path TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
            daily_activity_level,
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
            input_data["daily_activity_level"],
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

def save_weight_log(user_id, weight_kg, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO weight_logs (
            user_id,
            weight_kg,
            logged_date
        )
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, logged_date)
        DO UPDATE SET
            weight_kg = excluded.weight_kg,
            updated_at = CURRENT_TIMESTAMP
        """,
        (user_id, weight_kg, logged_date)
    )

    connection.commit()
    connection.close()
        
def get_weight_history(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        Select *
        FROM weight_logs
        WHERE user_id = ?
        ORDER BY logged_date DESC
        """,
        (user_id,)
    )

    weight_history = cursor.fetchall()
    connection.close()

    return weight_history

def get_weight_by_date(user_id, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM weight_logs
        WHERE user_id = ? AND logged_date = ?
        """,
        (user_id, logged_date)
    )

    weight = cursor.fetchone()
    connection.close()

    return weight

def get_latest_weight(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        Select *
        FROM weight_logs
        WHERE user_id = ?
        ORDER BY logged_date DESC
        LIMIT 1
        """,
        (user_id,)
    )

    latest_weight = cursor.fetchone()
    connection.close()

    return latest_weight

def save_food_log(user_id, food_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO food_logs (
            user_id,
            food_name,
            calories,
            meal_type,
            logged_date,
            logged_time,
            protein_g,
            carbs_g,
            fat_g,
            notes,
            photo_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            food_data["food_name"],
            food_data["calories"],
            food_data["meal_type"],
            food_data["logged_date"],
            food_data["logged_time"],
            food_data.get("protein_g"),
            food_data.get("carbs_g"),
            food_data.get("fat_g"),
            food_data.get("notes"),
            food_data.get("photo_path")
        )
    )

    connection.commit()
    connection.close()

def get_food_history(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM food_logs
        WHERE user_id = ?
        ORDER BY logged_date DESC, logged_time DESC, id DESC
        """,
        (user_id,)
    )

    food_history = cursor.fetchall()
    connection.close()

    return food_history

def get_food_logs_by_date(user_id, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM food_logs
        WHERE user_id = ? AND logged_date = ?
        ORDER BY logged_time ASC, id ASC
        """,
        (user_id, logged_date)
    )

    food_logs = cursor.fetchall()
    connection.close()

    return food_logs