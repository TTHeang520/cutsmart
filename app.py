from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello CutSmart"

app.run(debug=True)
