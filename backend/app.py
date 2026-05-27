from flask import Flask, request

app = Flask(__name__)

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
        "message": "Register route have received data",
        "received": data
    }

if __name__ == "__main__":
    app.run(debug=True)
