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

   
   
    
