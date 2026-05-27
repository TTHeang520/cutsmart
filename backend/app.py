from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello CutSmart"

@app.route("/api/test") 
def test():
    return {"message": "Backend is working"}

if __name__ == "__main__":
    app.run(debug=True)
