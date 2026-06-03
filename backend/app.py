import sqlite3

from flask import Flask, request
from database import init_db, create_user, get_user_from_email
from werkzeug.security import generate_password_hash, check_password_hash

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

if __name__ == "__main__":
    app.run(debug=True)
