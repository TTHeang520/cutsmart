import sqlite3

DATABASE_NAME = "cutsmart_database"

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

    
