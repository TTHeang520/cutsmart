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
        CREATE TABLE IF NOT EXISTS plan_journeys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            initial_weight_kg REAL NOT NULL,
            target_weight_kg REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ended_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            journey_id INTEGER,
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
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (journey_id) REFERENCES plan_journeys (id)
        )
    """)

    columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(user_plans)").fetchall()
    }
    if "exercise_habit" in columns and "daily_activity_level" not in columns:
        cursor.execute(
            "ALTER TABLE user_plans RENAME COLUMN exercise_habit TO daily_activity_level"
        )

    if "journey_id" not in columns:
        cursor.execute(
            """
            ALTER TABLE user_plans
            ADD COLUMN journey_id INTEGER REFERENCES plan_journeys (id)
            """
        )

    legacy_user_ids = cursor.execute(
        """
        SELECT DISTINCT user_id
        FROM user_plans
        WHERE journey_id IS NULL
        """
    ).fetchall()

    for row in legacy_user_ids:
        user_id = row[0]
        active_journey = cursor.execute(
            """
            SELECT id
            FROM plan_journeys
            WHERE user_id = ? AND status = 'active'
            ORDER BY started_at DESC, id DESC
            LIMIT 1
            """,
            (user_id,)
        ).fetchone()

        if active_journey is None:
            earliest_plan = cursor.execute(
                """
                SELECT current_weight_kg, target_weight_kg
                FROM user_plans
                WHERE user_id = ?
                ORDER BY created_at ASC, id ASC
                LIMIT 1
                """,
                (user_id,)
            ).fetchone()

            cursor.execute(
                """
                INSERT INTO plan_journeys (
                    user_id,
                    initial_weight_kg,
                    target_weight_kg
                )
                VALUES (?, ?, ?)
                """,
                (user_id, earliest_plan[0], earliest_plan[1])
            )
            journey_id = cursor.lastrowid
        else:
            journey_id = active_journey[0]

        cursor.execute(
            """
            UPDATE user_plans
            SET journey_id = ?
            WHERE user_id = ? AND journey_id IS NULL
            """,
            (journey_id, user_id)
        )

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weight_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        journey_id INTEGER NOT NULL,
        weight_kg REAL NOT NULL,
        logged_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (journey_id) REFERENCES plan_journeys (id),
        UNIQUE (user_id, journey_id, logged_date)
    )
    """)

    weight_columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(weight_logs)").fetchall()
    }

    if "journey_id" not in weight_columns:
        cursor.execute("DROP TABLE IF EXISTS weight_logs_migrated")
        cursor.execute("""
            CREATE TABLE weight_logs_migrated (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                journey_id INTEGER NOT NULL,
                weight_kg REAL NOT NULL,
                logged_date TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (journey_id) REFERENCES plan_journeys (id),
                UNIQUE (user_id, journey_id, logged_date)
            )
        """)

        cursor.execute("""
            INSERT INTO weight_logs_migrated (
                id,
                user_id,
                journey_id,
                weight_kg,
                logged_date,
                created_at,
                updated_at
            )
            SELECT
                weight_logs.id,
                weight_logs.user_id,
                plan_journeys.id,
                weight_logs.weight_kg,
                weight_logs.logged_date,
                weight_logs.created_at,
                weight_logs.updated_at
            FROM weight_logs
            JOIN plan_journeys
                ON plan_journeys.user_id = weight_logs.user_id
                AND plan_journeys.status = 'active'
        """)

        cursor.execute("DROP TABLE weight_logs")
        cursor.execute("ALTER TABLE weight_logs_migrated RENAME TO weight_logs")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS food_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        journey_id INTEGER NOT NULL,
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
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (journey_id) REFERENCES plan_journeys (id)
    )      
    """)

    food_columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(food_logs)").fetchall()
    }

    if "journey_id" not in food_columns:
        cursor.execute(
            """
            ALTER TABLE food_logs
            ADD COLUMN journey_id INTEGER REFERENCES plan_journeys (id)
            """
        )

    cursor.execute("""
        UPDATE food_logs
        SET journey_id = (
            SELECT id
            FROM plan_journeys
            WHERE plan_journeys.user_id = food_logs.user_id
                AND plan_journeys.status = 'active'
            ORDER BY started_at DESC, id DESC
            LIMIT 1
        )
        WHERE journey_id IS NULL
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        journey_id INTEGER NOT NULL,
        exercise_name TEXT NOT NULL,
        duration_minutes REAL NOT NULL,
        calories_burned REAL NOT NULL,
        logged_date TEXT NOT NULL,
        logged_time TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (journey_id) REFERENCES plan_journeys (id)
    )
    """)

    exercise_columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(exercise_logs)").fetchall()
    }

    if "journey_id" not in exercise_columns:
        cursor.execute(
            """
            ALTER TABLE exercise_logs
            ADD COLUMN journey_id INTEGER REFERENCES plan_journeys (id)
            """
        )

    cursor.execute("""
        UPDATE exercise_logs
        SET journey_id = (
            SELECT id
            FROM plan_journeys
            WHERE plan_journeys.user_id = exercise_logs.user_id
                AND plan_journeys.status = 'active'
            ORDER BY started_at DESC, id DESC
            LIMIT 1
        )
        WHERE journey_id IS NULL
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

def create_journey(user_id, initial_weight_kg, target_weight_kg):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO plan_journeys (
            user_id,
            initial_weight_kg,
            target_weight_kg
        )
        VALUES (?, ?, ?)
        """,
        (user_id, initial_weight_kg, target_weight_kg)
    )

    journey_id = cursor.lastrowid
    connection.commit()
    connection.close()

    return journey_id

def get_active_journey(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM plan_journeys
        WHERE user_id = ? AND status = 'active'
        ORDER BY started_at DESC, id DESC
        LIMIT 1
        """,
        (user_id,)
    )

    journey = cursor.fetchone()
    connection.close()

    return journey

def archive_active_journey(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE plan_journeys
        SET
            status = 'archived',
            ended_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND status = 'active'
        """,
        (user_id,)
    )

    archived_rows = cursor.rowcount
    connection.commit()
    connection.close()

    return archived_rows

def start_new_journey(user_id, initial_weight_kg, target_weight_kg, input_data, plan_result):
    connection = get_db_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            UPDATE plan_journeys
            SET
                status = 'archived',
                ended_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND status = 'active'
            """,
            (user_id,)
        )

        cursor.execute(
            """
            INSERT INTO plan_journeys (
                user_id,
                initial_weight_kg,
                target_weight_kg
            )
            VALUES (?, ?, ?)
            """,
            (user_id, initial_weight_kg, target_weight_kg)
        )

        journey_id = cursor.lastrowid
        journey = cursor.execute(
            """
            SELECT *
            FROM plan_journeys
            WHERE id = ?
            """,
            (journey_id,)
        ).fetchone()

        plan_id = _insert_user_plan(
            cursor,
            user_id,
            journey_id,
            input_data,
            plan_result
        )

        cursor.execute(
            """
            INSERT INTO weight_logs (
                user_id,
                journey_id,
                weight_kg,
                logged_date
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                user_id,
                journey_id,
                initial_weight_kg,
                journey["started_at"][:10]
            )
        )

        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    return {
        "journey": dict(journey),
        "plan_id": plan_id
    }

def update_journey_initial_weight(journey_id, user_id, initial_weight_kg):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE plan_journeys
        SET initial_weight_kg = ?
        WHERE id = ? AND user_id = ?
        """,
        (initial_weight_kg, journey_id, user_id)
    )

    updated_rows = cursor.rowcount
    connection.commit()
    connection.close()

    return updated_rows

def get_user_journeys(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM plan_journeys
        WHERE user_id = ?
        ORDER BY started_at DESC, id DESC
        """,
        (user_id,)
    )

    journeys = cursor.fetchall()
    connection.close()

    return journeys

def get_plans_by_journey(user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM user_plans
        WHERE user_id = ? AND journey_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (user_id, journey_id)
    )

    plans = cursor.fetchall()
    connection.close()

    return plans

def _insert_user_plan(cursor, user_id, journey_id, input_data, plan_result):
    alternative_plan_json = json.dumps(plan_result.get("alternative_plan"))

    cursor.execute(
        """
        INSERT INTO user_plans (
            user_id,
            journey_id,
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
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        """,
        (
            user_id,
            journey_id,
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

    return cursor.lastrowid

def save_user_plan(user_id, journey_id, input_data, plan_result):
    connection = get_db_connection()
    cursor = connection.cursor()

    plan_id = _insert_user_plan(
        cursor,
        user_id,
        journey_id,
        input_data,
        plan_result
    )

    connection.commit()
    connection.close()

    return plan_id

def get_latest_user_plan(user_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM user_plans
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        """,
        (user_id,)
    )

    plan = cursor.fetchone()
    connection.close()

    return plan

def save_weight_log(user_id, journey_id, weight_kg, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO weight_logs (
            user_id,
            journey_id,
            weight_kg,
            logged_date
        )
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, journey_id, logged_date)
        DO UPDATE SET
            weight_kg = excluded.weight_kg,
            updated_at = CURRENT_TIMESTAMP
        """,
        (user_id, journey_id, weight_kg, logged_date)
    )

    connection.commit()
    connection.close()
        
def get_weight_history(user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        Select *
        FROM weight_logs
        WHERE user_id = ? AND journey_id = ?
        ORDER BY logged_date DESC
        """,
        (user_id, journey_id)
    )

    weight_history = cursor.fetchall()
    connection.close()

    return weight_history

def get_latest_weight(user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        Select *
        FROM weight_logs
        WHERE user_id = ? AND journey_id = ?
        ORDER BY logged_date DESC, id DESC
        LIMIT 1
        """,
        (user_id, journey_id)
    )

    latest_weight = cursor.fetchone()
    connection.close()

    return latest_weight

def get_weight_by_date(user_id, journey_id, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM weight_logs
        WHERE user_id = ? AND journey_id = ? AND logged_date = ?
        """,
        (user_id, journey_id, logged_date)
    )

    weight = cursor.fetchone()
    connection.close()

    return weight

def save_food_log(user_id, journey_id, food_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO food_logs (
            user_id,
            journey_id,
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            journey_id,
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

def get_food_history(user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM food_logs
        WHERE user_id = ? AND journey_id = ?
        ORDER BY logged_date DESC, logged_time DESC, id DESC
        """,
        (user_id, journey_id)
    )

    food_history = cursor.fetchall()
    connection.close()

    return food_history

def get_food_logs_by_date(user_id, journey_id, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM food_logs
        WHERE user_id = ? AND journey_id = ? AND logged_date = ?
        ORDER BY logged_time ASC, id ASC
        """,
        (user_id, journey_id, logged_date)
    )

    food_logs = cursor.fetchall()
    connection.close()

    return food_logs

def update_food_log(food_id, user_id, journey_id, food_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE food_logs
        SET
            food_name = ?,
            calories = ?,
            meal_type = ?,
            logged_date = ?,
            logged_time = ?,
            protein_g = ?,
            carbs_g = ?,
            fat_g = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND journey_id = ?
        """,
        (
            food_data["food_name"],
            food_data["calories"],
            food_data["meal_type"],
            food_data["logged_date"],
            food_data["logged_time"],
            food_data.get("protein_g"),
            food_data.get("carbs_g"),
            food_data.get("fat_g"),
            food_data.get("notes"),
            food_id,
            user_id,
            journey_id
        )
    )

    updated_rows = cursor.rowcount
    connection.commit()
    connection.close()

    return updated_rows

def delete_food_log(food_id, user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM food_logs
        WHERE id = ? AND user_id = ? AND journey_id = ?
        """,
        (food_id, user_id, journey_id)
    )

    deleted_rows = cursor.rowcount
    connection.commit()
    connection.close()

    return deleted_rows

def save_exercise_log(user_id, journey_id, exercise_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO exercise_logs (
            user_id,
            journey_id,
            exercise_name,
            duration_minutes,
            calories_burned,
            logged_date,
            logged_time,
            notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            journey_id,
            exercise_data["exercise_name"],
            exercise_data["duration_minutes"],
            exercise_data["calories_burned"],
            exercise_data["logged_date"],
            exercise_data["logged_time"],
            exercise_data.get("notes")
        )
    )

    connection.commit()
    connection.close()

def get_exercise_history(user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM exercise_logs
        WHERE user_id = ? AND journey_id = ?
        ORDER BY logged_date DESC, logged_time DESC, id DESC
        """,
        (user_id, journey_id)
    )

    exercise_history = cursor.fetchall()
    connection.close()

    return exercise_history

def get_exercise_logs_by_date(user_id, journey_id, logged_date):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM exercise_logs
        WHERE user_id = ? AND journey_id = ? AND logged_date = ?
        ORDER BY logged_time ASC, id ASC
        """,
        (user_id, journey_id, logged_date)
    )

    exercise_logs = cursor.fetchall()
    connection.close()

    return exercise_logs

def update_exercise_log(exercise_id, user_id, journey_id, exercise_data):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE exercise_logs
        SET
            exercise_name = ?,
            duration_minutes = ?,
            calories_burned = ?,
            logged_date = ?,
            logged_time = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND journey_id = ?
        """,
        (
            exercise_data["exercise_name"],
            exercise_data["duration_minutes"],
            exercise_data["calories_burned"],
            exercise_data["logged_date"],
            exercise_data["logged_time"],
            exercise_data.get("notes"),
            exercise_id,
            user_id,
            journey_id
        )
    )

    updated_rows = cursor.rowcount
    connection.commit()
    connection.close()

    return updated_rows

def delete_exercise_log(exercise_id, user_id, journey_id):
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM exercise_logs
        WHERE id = ? AND user_id = ? AND journey_id = ?
        """,
        (exercise_id, user_id, journey_id)
    )

    deleted_rows = cursor.rowcount
    connection.commit()
    connection.close()

    return deleted_rows