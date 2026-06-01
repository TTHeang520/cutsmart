import sqlite3

from flask import Flask, request
from database import init_db, create_user
from werkzeug.security import generate_password_hash

app = Flask(__name__)
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

    username = data["username"]
    email = data["email"]
    password = data["password"]

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

if __name__ == "__main__":
    app.run(debug=True)
