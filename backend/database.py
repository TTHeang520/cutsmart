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

    
