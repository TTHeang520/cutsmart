from flask import Flask, request
from database import init_db

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
    return {
        "message": "Register route received data",
        "received": data
    }

if __name__ == "__main__":
    app.run(debug=True)
