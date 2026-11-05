import json
import mimetypes
import os
import re
import sqlite3
from datetime import date, time

from flask import Flask, request, send_from_directory, g, make_response
from auth import init_auth, issue_session, COOKIE_NAME, SESSION_SECONDS
from database import get_db_connection
from database import init_db, create_user, get_user_from_email, get_active_journey, start_new_journey, save_user_plan, get_latest_user_plan, save_weight_log, get_weight_history, get_weight_by_date, get_latest_weight, get_weight_entry, update_weight_log, delete_weight_log, save_food_log, get_food_history, get_food_logs_by_date, update_food_log, delete_food_log, save_exercise_log, get_exercise_history, get_exercise_logs_by_date, update_exercise_log, delete_exercise_log, get_user_journeys, get_journey_for_user, get_plans_by_journey, get_food_entry, update_food_photo_path, get_daily_activity
from planner import generate_plan
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
from uuid import uuid4
from PIL import Image, ImageOps, UnidentifiedImageError
from config import DATA_DIR, FRONTEND_DIR, PRODUCTION

# Some systems (e.g. Windows) do not map .webp, so photos would be served as
# application/octet-stream, which nosniff tells browsers not to display.
mimetypes.add_type("image/webp", ".webp")

app = Flask(__name__)
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("CUTSMART_ENV") == "production"

# Hosts such as PythonAnywhere run the app behind their own proxy. Without this,
# every visitor appears to come from the proxy's address and shares one login
# rate limit. Set CUTSMART_PROXY_HOPS only when such a proxy is really in front.
_proxy_hops = os.environ.get("CUTSMART_PROXY_HOPS")
if _proxy_hops:
    hops = int(_proxy_hops)
    if hops < 1:
        raise RuntimeError("CUTSMART_PROXY_HOPS must be a positive whole number")
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops)
FOOD_PHOTO_FOLDER = (
    DATA_DIR
    / "uploads"
    / "food_photos"
)

ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024

FOOD_PHOTO_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)

# Leave room for multipart form overhead; the photo itself is checked separately.
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_SIZE + 1024 * 1024

@app.errorhandler(RequestEntityTooLarge)
def handle_large_upload(error):
    return {
        "success": False,
        "message": "Photo must not exceed 5 MB"
    }, 413

def allowed_image_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_IMAGE_EXTENSIONS
    )

# Photos are re-encoded on upload: phone pictures are often 3-5 MB, and hosting
# disk is small (512 MB on PythonAnywhere's free plan). Re-encoding also drops
# hidden EXIF metadata such as the GPS location where the photo was taken.
MAX_PHOTO_SIDE = 1280
PHOTO_QUALITY = 80


def save_compressed_photo(photo, file_path):
    """Save an already validated upload as a resized WebP image without metadata."""
    photo.stream.seek(0)

    with Image.open(photo.stream) as image:
        # Apply the camera's rotation flag before EXIF data is discarded.
        image = ImageOps.exif_transpose(image)
        image.thumbnail((MAX_PHOTO_SIDE, MAX_PHOTO_SIDE))

        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")

        image.save(file_path, "WEBP", quality=PHOTO_QUALITY, method=4)


def detect_image_extension(photo):
    try:
        image = Image.open(photo.stream)
        image.verify()

        image_format = image.format.lower()
        photo.stream.seek(0)
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError):
        photo.stream.seek(0)
        return None

    format_extensions = {
        "jpeg": "jpg",
        "png": "png",
        "webp": "webp"
    }

    return format_extensions.get(image_format)

init_db()
init_auth(app)


@app.after_request
def private_response(response):
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/api/session")
def current_session():
    return {"success": True, "user_id": g.user_id, "csrf_token": g.csrf_token}


@app.post("/api/logout")
def logout():
    connection = get_db_connection()
    try:
        connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (g.session_hash,))
        connection.commit()
    finally:
        connection.close()
    response = make_response({"success": True})
    response.delete_cookie(COOKIE_NAME, path="/")
    return response


@app.route("/")
def home():
    if (FRONTEND_DIR / "index.html").is_file():
        return send_from_directory(FRONTEND_DIR, "index.html")
    return "Hello CutSmart"


@app.get("/<path:path>")
def frontend_page(path):
    if path == "api" or path.startswith("api/"):
        return {"success": False, "message": "API route not found"}, 404
    # Serve only compiled assets or known React routes, never backend/data files.
    if path.startswith("assets/") or path in {"favicon.svg", "icons.svg", "plant-stage-1.png"}:
        return send_from_directory(FRONTEND_DIR, path)
    routes = {"login", "register", "welcome", "dashboard", "plan", "food-log",
              "exercise-log", "weight-track", "calendar", "reports", "settings",
              "journey-history", "profile", "activity-history"}
    if path in routes or (path.startswith("journeys/") and path[9:].isdigit()):
        return send_from_directory(FRONTEND_DIR, "index.html")
    return {"success": False, "message": "Not found"}, 404


@app.route("/api/test")
def test():
    return {"message": "Backend is working"}


def clean_text(value, label, max_length, required=False):
    """Return (stripped_text_or_None, error_message_or_None) for a free-text field."""
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            return None, f"{label} is required"
        return None, None

    if not isinstance(value, str):
        return None, f"{label} must be text"

    value = value.strip()

    if len(value) > max_length:
        return None, f"{label} must be {max_length} characters or fewer"

    return value, None


def clean_text_fields(data, fields):
    """Clean (key, label, max_length, required) fields in place; return the first error."""
    for key, label, max_length, required in fields:
        data[key], error = clean_text(data.get(key), label, max_length, required)

        if error:
            return error

    return None


MAX_FOOD_CALORIES = 10000
MAX_MACRO_GRAMS = 1000
MAX_EXERCISE_MINUTES = 1440
MAX_EXERCISE_CALORIES = 10000
MIN_LOG_WEIGHT_KG = 20
MAX_LOG_WEIGHT_KG = 500


FOOD_TEXT_FIELDS = [
    ("food_name", "Food name", 100, True),
    ("notes", "Notes", 500, False),
]

EXERCISE_TEXT_FIELDS = [
    ("exercise_name", "Exercise name", 100, True),
    ("category", "Category", 40, False),
    ("notes", "Notes", 500, False),
]


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$")
# Gmail has no regional domains, so anything close to it is a typo.
GMAIL_TYPO_NAMES = {"gmail", "gmial", "gamil", "gmal", "gmai", "gmaill", "gnail", "gmaul"}
MIN_PASSWORD_LENGTH = 8


def get_email_error(email):
    if len(email) > 254 or not EMAIL_PATTERN.match(email):
        return "Enter a valid email address, for example name@gmail.com"

    local_part, domain = email.rsplit("@", 1)

    if domain.split(".")[0] in GMAIL_TYPO_NAMES and domain not in ("gmail.com", "googlemail.com"):
        return f"Did you mean {local_part}@gmail.com?"

    return None


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return {"success": False, "message": "Expected a JSON object"}, 400

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all(isinstance(value, str) and value.strip() for value in (username, email, password)):
        return {
            "success": False,
            "message": "Username, email, and password are required"
        }, 400

    username = username.strip()
    email = email.strip().lower()

    if len(username) > 30:
        return {
            "success": False,
            "message": "Username must be 30 characters or fewer"
        }, 400

    email_error = get_email_error(email)

    if email_error:
        return {
            "success": False,
            "message": email_error
        }, 400

    if len(password) < MIN_PASSWORD_LENGTH:
        return {
            "success": False,
            "message": f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        }, 400

    if get_user_from_email(email) is not None:
        return {
            "success": False,
            "message": "Email already registered"
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
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return {"success": False, "message": "Expected a JSON object"}, 400

    email = data.get("email")
    password = data.get("password")

    if not all(isinstance(value, str) and value.strip() for value in (email, password)):
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

    token, csrf = issue_session(user[0])
    response = make_response({
        "success": True,
        "csrf_token": csrf,
        "message": "Login successful",
        "user": {
            "id": user[0],
            "username": user[1],
            "email": user[2]
        }
    })
    response.set_cookie(COOKIE_NAME, token, max_age=SESSION_SECONDS,
                        httponly=True, secure=app.config["SESSION_COOKIE_SECURE"],
                        samesite="Lax", path="/")
    return response


PLAN_REQUIRED_FIELDS = [
    "age",
    "gender",
    "height_cm",
    "current_weight_kg",
    "target_weight_kg",
    "daily_activity_level",
    "strategy"
]

VALID_DAILY_ACTIVITY_LEVELS = [
    "mostly_sitting",
    "light_daily_movement",
    "on_feet_often",
    "physical_daily_routine"
]

# Inclusive (minimum, maximum, label) limits. The calorie formulas are for adults,
# and values outside these ranges are almost always typing mistakes.
PLAN_NUMBER_LIMITS = {
    "age": (18, 100, "Age must be between 18 and 100 years"),
    "height_cm": (100, 250, "Height must be between 100 and 250 cm"),
    "current_weight_kg": (30, 350, "Current weight must be between 30 and 350 kg"),
    "target_weight_kg": (30, 350, "Target weight must be between 30 and 350 kg"),
    "desired_timeline_weeks": (1, 520, "Desired timeline must be between 1 and 520 weeks"),
}

MIN_TARGET_BMI = 18.5


def validate_plan_input(data):
    """Return (clean_input, None) for valid plan details, or (None, error_message)."""
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object"

    for field in PLAN_REQUIRED_FIELDS:
        if field not in data or data[field] in ("", None):
            return None, "Age, gender, height, current weight, target weight, daily activity level, and strategy are required"

    if data["gender"] not in ["male", "female"]:
        return None, "Invalid gender"

    if data["daily_activity_level"] not in VALID_DAILY_ACTIVITY_LEVELS:
        return None, "Invalid daily activity level"

    if data["strategy"] not in ["diet", "exercise", "balanced"]:
        return None, "Invalid strategy"

    clean = {
        "gender": data["gender"],
        "daily_activity_level": data["daily_activity_level"],
        "strategy": data["strategy"],
        "desired_timeline_weeks": None,
    }

    number_fields = ["age", "height_cm", "current_weight_kg", "target_weight_kg"]

    if data.get("desired_timeline_weeks") not in ("", None):
        number_fields.append("desired_timeline_weeks")

    for field in number_fields:
        value = data[field]

        # bool is a subclass of int, so reject it explicitly.
        if isinstance(value, bool):
            return None, "Age, height, current weight, target weight, and desired timeline must be numbers"

        try:
            number = float(value)
        except (TypeError, ValueError):
            return None, "Age, height, current weight, target weight, and desired timeline must be numbers"

        minimum, maximum, message = PLAN_NUMBER_LIMITS[field]

        # NaN fails both comparisons, so test the valid range rather than the invalid one.
        if not minimum <= number <= maximum:
            return None, message

        clean[field] = number

    if clean["target_weight_kg"] >= clean["current_weight_kg"]:
        return None, "Target weight must be lower than current weight for a weight-loss plan"

    height_m = clean["height_cm"] / 100
    if clean["target_weight_kg"] / (height_m * height_m) < MIN_TARGET_BMI:
        lowest_target = MIN_TARGET_BMI * height_m * height_m
        return None, (
            "Target weight would be underweight for your height. "
            f"Choose a target of at least {lowest_target:.1f} kg"
        )

    return clean, None


def plan_failure_message(plan_input, plan_option):
    """Explain why generate_plan returned None for input that passed validation."""
    if plan_option not in ("steady", "fastest_safe"):
        return "Plan option must be steady or fastest_safe"

    if plan_option == "fastest_safe":
        return "A faster option is not available for this plan"

    # Validated input only fails when there is no room for a safe calorie deficit.
    return (
        "Your estimated daily energy use is already close to CutSmart's minimum safe "
        "intake, so it cannot create a safe calorie deficit for you. Try a more active "
        "daily activity level, or speak to a health professional for advice."
    )


@app.route("/api/plan", methods=["POST"])
def plan():
    data = request.get_json(silent=True)
    clean, error = validate_plan_input(data)

    if error:
        return {
            "success": False,
            "message": error
        }, 400

    plan_option = data.get("plan_option", "steady")
    plan_result = generate_plan({**clean, "plan_option": plan_option})

    if plan_result is None:
        return {
            "success": False,
            "message": plan_failure_message(clean, plan_option)
        }, 400

    return {
        "success": True,
        "message": "Plan generated successfully",
        "plan": plan_result
    }

@app.route("/api/plans/save", methods=["POST"])
def save_plan():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    user_id = data.get("user_id")
    input_data = data.get("input_data")
    client_plan = data.get("plan_result")
    mode = data.get("mode", "update")
    start_date = data.get("start_date")

    if start_date is not None:
        try:
            if date.fromisoformat(start_date).isoformat() != start_date:
                raise ValueError
        except (TypeError, ValueError):
            return {
                "success": False,
                "message": "Start date must use YYYY-MM-DD format"
            }, 400

    if mode not in ("update", "new"):
        return {
            "success": False,
            "message": "Mode must be update or new"
        }, 400

    if not user_id or not input_data:
        return {
            "success": False,
            "message": "User id and input data are required"
        }, 400

    clean_input, error = validate_plan_input(input_data)

    if error:
        return {
            "success": False,
            "message": error
        }, 400

    # Never store numbers calculated by the browser: recalculate the plan here.
    # The client only chooses between the steady and faster pace.
    plan_option = data.get("plan_option")

    if plan_option is None:
        is_faster = isinstance(client_plan, dict) and client_plan.get("timeline_status") == "fastest_safe"
        plan_option = "fastest_safe" if is_faster else "steady"

    plan_result = generate_plan({**clean_input, "plan_option": plan_option})

    if plan_result is None:
        return {
            "success": False,
            "message": plan_failure_message(clean_input, plan_option)
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        mode = "new"

    try:
        if mode == "new":
            result = start_new_journey(
                user_id,
                clean_input["current_weight_kg"],
                clean_input["target_weight_kg"],
                clean_input,
                plan_result,
                start_date
            )
            journey_id = result["journey"]["id"]
            plan_id = result["plan_id"]
        else:
            journey_id = journey["id"]
            plan_id = save_user_plan(
                user_id,
                journey_id,
                clean_input,
                plan_result
            )
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    return {
        "success": True,
        "message": "Plan saved successfully",
        "mode": mode,
        "journey_id": journey_id,
        "plan_id": plan_id,
        "plan": {**clean_input, **plan_result}
    }


@app.route("/api/plans/latest/<int:user_id>", methods=["GET"])
def latest_plan(user_id):
    plan = get_latest_user_plan(user_id)

    if plan is None:
        return {
            "success": False,
            "message": "No saved plan found"
        }, 404

    plan_data = dict(plan)

    if plan_data["alternative_plan"] is not None:
        plan_data["alternative_plan"] = json.loads(plan_data["alternative_plan"])

    return {
        "success": True,
        "message": "Latest plan fetched successfully",
        "plan": plan_data
    }


@app.route("/api/journeys/history/<int:user_id>", methods=["GET"])
def journey_history(user_id):
    journeys = get_user_journeys(user_id)

    return {
        "success": True,
        "message": "Journey history fetched successfully",
        "journeys": [dict(journey) for journey in journeys]
    }


@app.route(
    "/api/users/<int:user_id>/journeys/<int:journey_id>/plans",
    methods=["GET"]
)
def plans_by_journey(user_id, journey_id):
    journey = get_journey_for_user(user_id, journey_id)

    if journey is None:
        return {
            "success": False,
            "message": "Journey not found"
        }, 404

    plans = get_plans_by_journey(user_id, journey_id)

    plan_list = []

    for plan in plans:
        plan_data = dict(plan)

        if plan_data["alternative_plan"]:
            plan_data["alternative_plan"] = json.loads(
                plan_data["alternative_plan"]
            )

        plan_list.append(plan_data)

    return {
        "success": True,
        "message": "Journey plans fetched successfully",
        "journey": dict(journey),
        "plans": plan_list
    }


@app.route(
    "/api/users/<int:user_id>/journeys/<int:journey_id>/weights",
    methods=["GET"]
)
def journey_weight_history(user_id, journey_id):
    journey = get_journey_for_user(user_id, journey_id)

    if journey is None:
        return {
            "success": False,
            "message": "Journey not found"
        }, 404

    history = get_weight_history(user_id, journey_id)

    return {
        "success": True,
        "message": "Journey weight history fetched successfully",
        "journey": dict(journey),
        "weights": [dict(row) for row in history]
    }


MAX_ACTIVITY_DAYS = 400


@app.route("/api/activity/<int:user_id>", methods=["GET"])
def daily_activity(user_id):
    dates = {}

    for name in ("start", "end"):
        value = request.args.get(name, "")

        try:
            dates[name] = date.fromisoformat(value)
        except ValueError:
            dates[name] = None

        if dates[name] is None or dates[name].isoformat() != value:
            return {
                "success": False,
                "message": "Start and end must be dates in YYYY-MM-DD format"
            }, 400

    span = (dates["end"] - dates["start"]).days

    if span < 0 or span >= MAX_ACTIVITY_DAYS:
        return {
            "success": False,
            "message": f"End must be on or after start, within {MAX_ACTIVITY_DAYS} days"
        }, 400

    days = get_daily_activity(user_id, dates["start"].isoformat(), dates["end"].isoformat())

    return {
        "success": True,
        "message": "Daily activity fetched successfully",
        "days": [
            {
                "date": row["logged_date"],
                "calories_eaten": row["calories_eaten"],
                "calories_burned": row["calories_burned"],
                "active_minutes": row["active_minutes"],
                "food_entries": row["food_entries"],
                "exercise_entries": row["exercise_entries"],
                "weight_logged": bool(row["weight_logged"]),
            }
            for row in days
        ]
    }


def parse_weight_entry(data):
    """Return (weight_kg, logged_date, note, error_message) for a weight request body."""
    note, error = clean_text(data.get("note"), "Note", 200)

    if error:
        return None, None, None, error

    weight_kg = data.get("weight_kg")
    logged_date = data.get("logged_date")

    if weight_kg in ("", None) or not logged_date:
        return None, None, None, "Weight and logged date are required"

    if isinstance(weight_kg, bool):
        return None, None, None, "Weight must be a number"

    try:
        weight_kg = float(weight_kg)
    except (TypeError, ValueError):
        return None, None, None, "Weight must be a number"

    if not MIN_LOG_WEIGHT_KG <= weight_kg <= MAX_LOG_WEIGHT_KG:
        return None, None, None, f"Weight must be between {MIN_LOG_WEIGHT_KG} and {MAX_LOG_WEIGHT_KG} kg"

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return None, None, None, "Logged date must be a real date in YYYY-MM-DD format"

    if parsed_date.isoformat() != logged_date:
        return None, None, None, "Logged date must use YYYY-MM-DD format"

    return weight_kg, logged_date, note, None


def parse_user_id(data):
    """Return a positive integer user id from a JSON body, or None."""
    value = data.get("user_id")

    if isinstance(value, bool):
        return None

    try:
        user_id = int(value)
    except (TypeError, ValueError):
        return None

    return user_id if user_id > 0 else None


@app.route("/api/weights", methods=["POST"])
def create_weight_log():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    user_id = parse_user_id(data)

    if user_id is None:
        return {
            "success": False,
            "message": "User id must be a positive number"
        }, 400

    weight_kg, logged_date, note, error = parse_weight_entry(data)

    if error:
        return {
            "success": False,
            "message": error
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    try:
        save_weight_log(user_id, journey["id"], weight_kg, logged_date, note)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    # Saving is an upsert by date, so read back the regular entry to return its id.
    saved = get_weight_by_date(user_id, journey["id"], logged_date)

    return {
        "success": True,
        "message": "Weight recorded successfully",
        "weight": dict(saved) if saved is not None else {
            "user_id": user_id,
            "journey_id": journey["id"],
            "weight_kg": weight_kg,
            "logged_date": logged_date,
            "note": note
        }
    }


@app.route("/api/weights/<int:weight_id>", methods=["PUT"])
def update_weight_entry(weight_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    user_id = parse_user_id(data)

    if user_id is None:
        return {
            "success": False,
            "message": "User id must be a positive number"
        }, 400

    weight_kg, logged_date, note, error = parse_weight_entry(data)

    if error:
        return {
            "success": False,
            "message": error
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    weight = get_weight_entry(weight_id, user_id, journey["id"])

    if weight is None:
        return {
            "success": False,
            "message": "Weight entry not found"
        }, 404

    # The starting weight marks the day the journey began, so only its value and note change.
    if weight["is_initial"] and logged_date != weight["logged_date"]:
        return {
            "success": False,
            "message": "The starting weight's date cannot be changed"
        }, 400

    try:
        update_weight_log(weight_id, user_id, journey["id"], weight_kg, logged_date, note)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "You already have a weight entry on that date. Edit that entry instead"
        }, 409

    updated = get_weight_entry(weight_id, user_id, journey["id"])

    return {
        "success": True,
        "message": "Weight entry updated successfully",
        "weight": dict(updated)
    }


@app.route("/api/weights/<int:weight_id>", methods=["DELETE"])
def delete_weight_entry(weight_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    try:
        user_id = int(data.get("user_id"))
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id must be a number"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    weight = get_weight_entry(weight_id, user_id, journey["id"])

    if weight is None:
        return {
            "success": False,
            "message": "Weight entry not found"
        }, 404

    if weight["is_initial"]:
        return {
            "success": False,
            "message": "The starting weight of a journey cannot be deleted"
        }, 400

    delete_weight_log(weight_id, user_id, journey["id"])

    return {
        "success": True,
        "message": "Weight entry deleted successfully"
    }

@app.route("/api/weights/history/<int:user_id>", methods=["GET"])
def weight_history(user_id):
    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    history = get_weight_history(user_id, journey["id"])
    
    return {
        "success": True,
        "message": "Weight history fetched successfully",
        # The journey carries the baseline and target used for progress figures.
        "journey": dict(journey),
        "history": [dict(row) for row in history]
    }

@app.route("/api/weights/latest/<int:user_id>", methods=["GET"])
def latest_weight(user_id):
    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    latest = get_latest_weight(user_id, journey["id"])

    if latest is None:
        return {
            "success": False,
            "message": "No weight found"
        }, 404
    
    return {
        "success": True,
        "message": "Latest weight fetched successfully",
        "latest": dict(latest)
    }

@app.route("/api/weights/<int:user_id>", methods=["GET"])
def weight_by_date(user_id):
    logged_date = request.args.get("date")

    if not logged_date:
        return {
            "success": False,
            "message": "Date query parameter is required"
        }, 400

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != logged_date:
        return {
            "success": False,
            "message": "Date must use YYYY-MM-DD format"
        }, 400

    # The calendar views every journey; logging pages stay on the active one.
    if request.args.get("all_journeys") == "1":
        journey_id = None
    else:
        journey = get_active_journey(user_id)

        if journey is None:
            return {
                "success": False,
                "message": "Active journey not found. Create a plan first"
            }, 404

        journey_id = journey["id"]

    weight = get_weight_by_date(user_id, journey_id, logged_date)

    if weight is None:
        return {
            "success": False,
            "message": "No weight found for this date"
        }, 404

    return {
        "success": True,
        "message": "Weight fetched successfully",
        "date": logged_date,
        "weight": dict(weight)
    }

@app.route("/api/foods/<int:food_id>/photo", methods=["POST"])
def upload_food_photo(food_id):
    user_id = request.form.get("user_id")
    photo = request.files.get("photo")

    if not user_id:
        return {
            "success": False,
            "message": "User id is required"
        }, 400

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id must be a number"
        }, 400

    if photo is None or not photo.filename:
        return {
            "success": False,
            "message": "Photo is required"
        }, 400

    if not allowed_image_file(photo.filename):
        return {
            "success": False,
            "message": "Photo must be a JPG, JPEG, PNG, or WebP image"
        }, 400

    photo.stream.seek(0, os.SEEK_END)
    photo_size = photo.stream.tell()
    photo.stream.seek(0)

    if photo_size > MAX_IMAGE_SIZE:
        return {
            "success": False,
            "message": "Photo must not exceed 5 MB"
        }, 413

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    food = get_food_entry(
        food_id,
        user_id,
        journey["id"]
    )

    if food is None:
        return {
            "success": False,
            "message": "Food entry not found"
        }, 404

    old_photo_path = food["photo_path"]

    extension = detect_image_extension(photo)

    if extension is None:
        return {
            "success": False,
            "message": "Uploaded file is not a valid JPG, PNG, or WebP image"
        }, 400
    filename = f"{uuid4().hex}.webp"

    file_path = FOOD_PHOTO_FOLDER / filename

    try:
        save_compressed_photo(photo, file_path)
    except (OSError, ValueError, Image.DecompressionBombError):
        file_path.unlink(missing_ok=True)

        return {
            "success": False,
            "message": "This photo could not be processed. Try a different image"
        }, 400

    stored_path = f"food_photos/{filename}"

    updated_rows = update_food_photo_path(
        food_id,
        user_id,
        journey["id"],
        stored_path
    )

    if updated_rows == 0:
        file_path.unlink(missing_ok=True)

        return {
            "success": False,
            "message": "Food entry not found"
        }, 404

    if old_photo_path:
        old_filename = Path(old_photo_path).name
        old_file_path = FOOD_PHOTO_FOLDER / old_filename

        if old_file_path != file_path:
            old_file_path.unlink(missing_ok=True)

    return {
        "success": True,
        "message": "Food photo uploaded successfully",
        "photo_path": stored_path,
        "photo_url": f"/api/uploads/{stored_path}"
    }

@app.route("/api/foods/<int:food_id>/photo", methods=["DELETE"])
def delete_food_photo(food_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    user_id = data.get("user_id")

    if user_id in ("", None):
        return {
            "success": False,
            "message": "User id is required"
        }, 400

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id must be a number"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    food = get_food_entry(
        food_id,
        user_id,
        journey["id"]
    )

    if food is None:
        return {
            "success": False,
            "message": "Food entry not found"
        }, 404

    if not food["photo_path"]:
        return {
            "success": False,
            "message": "Food photo not found"
        }, 404

    filename = Path(food["photo_path"]).name
    file_path = FOOD_PHOTO_FOLDER / filename

    updated_rows = update_food_photo_path(
        food_id,
        user_id,
        journey["id"],
        None
    )

    if updated_rows == 0:
        return {
            "success": False,
            "message": "Food entry not found"
        }, 404

    file_path.unlink(missing_ok=True)

    return {
        "success": True,
        "message": "Food photo deleted successfully"
    }

@app.route(
    "/api/uploads/<path:photo_path>",
    methods=["GET"]
)
def serve_uploaded_photo(photo_path):
    connection = get_db_connection()
    try:
        owner = connection.execute(
            "SELECT id FROM food_logs WHERE photo_path = ? AND user_id = ?",
            (photo_path, g.user_id),
        ).fetchone()
    finally:
        connection.close()
    if owner is None:
        return {"success": False, "message": "Photo not found"}, 404
    return send_from_directory(
        FOOD_PHOTO_FOLDER.parent,
        photo_path
    )

@app.route("/api/foods", methods=["POST"])
def create_food_log():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    required_fields = [
        "user_id",
        "food_name",
        "calories",
        "meal_type",
        "logged_date",
        "logged_time"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "User id, food name, calories, meal type, date, and time are required"
            }, 400

    text_error = clean_text_fields(data, FOOD_TEXT_FIELDS)

    if text_error:
        return {
            "success": False,
            "message": text_error
        }, 400

    try:
        user_id = int(data["user_id"])
        data["calories"] = float(data["calories"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id and calories must be numbers"
        }, 400

    if user_id <= 0 or data["calories"] <= 0:
        return {
            "success": False,
            "message": "User id and calories must be positive"
        }, 400

    # "not <=" also rejects NaN and infinity, which JSON cannot represent.
    if not data["calories"] <= MAX_FOOD_CALORIES:
        return {
            "success": False,
            "message": f"Calories must be {MAX_FOOD_CALORIES:,} kcal or less"
        }, 400

    valid_meal_types = [
        "breakfast",
        "lunch",
        "dinner",
        "snack"
    ]

    if data["meal_type"] not in valid_meal_types:
        return {
            "success": False,
            "message": "Invalid meal type"
        }, 400

    try:
        parsed_date = date.fromisoformat(data["logged_date"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != data["logged_date"]:
        return {
            "success": False,
            "message": "Logged date must use YYYY-MM-DD format"
        }, 400

    try:
        parsed_time = time.fromisoformat(data["logged_time"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged time must be a real time in HH:MM format"
        }, 400

    if parsed_time.strftime("%H:%M") != data["logged_time"]:
        return {
            "success": False,
            "message": "Logged time must use HH:MM format"
        }, 400

    optional_macros = ["protein_g", "carbs_g", "fat_g"]

    try:
        for field in optional_macros:
            if data.get(field) in ("", None):
                data[field] = None
            else:
                data[field] = float(data[field])

                if not 0 <= data[field] <= MAX_MACRO_GRAMS:
                    return {
                        "success": False,
                        "message": f"Macro values must be between 0 and {MAX_MACRO_GRAMS} g"
                    }, 400
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Macro values must be numbers"
        }, 400

    data["photo_path"] = None

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    try:
        food_id = save_food_log(user_id, journey["id"], data)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    return {
        "success": True,
        "message": "Food recorded successfully",
        "food": {
            "id": food_id,
            "user_id": user_id,
            "journey_id": journey["id"],
            "food_name": data["food_name"],
            "calories": data["calories"],
            "meal_type": data["meal_type"],
            "logged_date": data["logged_date"],
            "logged_time": data["logged_time"],
            "protein_g": data.get("protein_g"),
            "carbs_g": data.get("carbs_g"),
            "fat_g": data.get("fat_g"),
            "notes": data.get("notes"),
            "photo_path": None
        }
    }



@app.route("/api/foods/history/<int:user_id>", methods=["GET"])
def food_history(user_id):
    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    history = get_food_history(user_id, journey["id"])

    return {
        "success": True,
        "message": "Food history fetched successfully",
        "history": [dict(row) for row in history]
    }

@app.route(
    "/api/users/<int:user_id>/journeys/<int:journey_id>/foods",
    methods=["GET"]
)
def journey_food_history(user_id, journey_id):
    journey = get_journey_for_user(user_id, journey_id)

    if journey is None:
        return {
            "success": False,
            "message": "Journey not found"
        }, 404

    history = get_food_history(user_id, journey_id)

    return {
        "success": True,
        "message": "Journey food history fetched successfully",
        "journey": dict(journey),
        "foods": [dict(row) for row in history]
    }

@app.route("/api/foods/<int:user_id>", methods=["GET"])
def foods_by_date(user_id):
    logged_date = request.args.get("date")

    if not logged_date:
        return {
            "success": False,
            "message": "Date query parameter is required"
        }, 400

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != logged_date:
        return {
            "success": False,
            "message": "Date must use YYYY-MM-DD format"
        }, 400

    # The calendar views every journey; logging pages stay on the active one.
    if request.args.get("all_journeys") == "1":
        journey_id = None
    else:
        journey = get_active_journey(user_id)

        if journey is None:
            return {
                "success": False,
                "message": "Active journey not found. Create a plan first"
            }, 404

        journey_id = journey["id"]

    food_logs = get_food_logs_by_date(user_id, journey_id, logged_date)

    total_calories = sum(row["calories"] for row in food_logs)

    return {
        "success": True,
        "message": "Food logs fetched successfully",
        "date": logged_date,
        "foods": [dict(row) for row in food_logs],
        "summary": {
            "entry_count": len(food_logs),
            "total_calories": total_calories
        }
    }

@app.route("/api/foods/<int:food_id>", methods=["PUT"])
def update_food_entry(food_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    required_fields = [
        "user_id",
        "food_name",
        "calories",
        "meal_type",
        "logged_date",
        "logged_time"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "User id, food name, calories, meal type, date, and time are required"
            }, 400

    text_error = clean_text_fields(data, FOOD_TEXT_FIELDS)

    if text_error:
        return {
            "success": False,
            "message": text_error
        }, 400

    try:
        user_id = int(data["user_id"])
        data["calories"] = float(data["calories"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id and calories must be numbers"
        }, 400

    if user_id <= 0 or data["calories"] <= 0:
        return {
            "success": False,
            "message": "User id and calories must be positive"
        }, 400

    # "not <=" also rejects NaN and infinity, which JSON cannot represent.
    if not data["calories"] <= MAX_FOOD_CALORIES:
        return {
            "success": False,
            "message": f"Calories must be {MAX_FOOD_CALORIES:,} kcal or less"
        }, 400

    valid_meal_types = ["breakfast", "lunch", "dinner", "snack"]

    if data["meal_type"] not in valid_meal_types:
        return {
            "success": False,
            "message": "Invalid meal type"
        }, 400

    try:
        parsed_date = date.fromisoformat(data["logged_date"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != data["logged_date"]:
        return {
            "success": False,
            "message": "Logged date must use YYYY-MM-DD format"
        }, 400

    try:
        parsed_time = time.fromisoformat(data["logged_time"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged time must be a real time in HH:MM format"
        }, 400

    if parsed_time.strftime("%H:%M") != data["logged_time"]:
        return {
            "success": False,
            "message": "Logged time must use HH:MM format"
        }, 400

    optional_macros = ["protein_g", "carbs_g", "fat_g"]

    try:
        for field in optional_macros:
            if data.get(field) in ("", None):
                data[field] = None
            else:
                data[field] = float(data[field])

                if not 0 <= data[field] <= MAX_MACRO_GRAMS:
                    return {
                        "success": False,
                        "message": f"Macro values must be between 0 and {MAX_MACRO_GRAMS} g"
                    }, 400
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Macro values must be numbers"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    updated_rows = update_food_log(food_id, user_id, journey["id"], data)

    if updated_rows == 0:
        return {
            "success": False,
            "message": "Food entry not found"
        }, 404

    updated_food = get_food_entry(food_id, user_id, journey["id"])

    return {
        "success": True,
        "message": "Food entry updated successfully",
        "food": dict(updated_food)
    }

@app.route("/api/foods/<int:food_id>", methods=["DELETE"])
def delete_food_entry(food_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    user_id = data.get("user_id")

    if user_id in ("", None):
        return {
            "success": False,
            "message": "User id is required"
        }, 400

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id must be a number"
        }, 400

    if user_id <= 0:
        return {
            "success": False,
            "message": "User id must be positive"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    food = get_food_entry(food_id, user_id, journey["id"])
    deleted_rows = delete_food_log(food_id, user_id, journey["id"])

    if deleted_rows == 0:
        return {
            "success": False,
            "message": "Food entry not found"
        }, 404

    if food is not None and food["photo_path"]:
        (FOOD_PHOTO_FOLDER / Path(food["photo_path"]).name).unlink(missing_ok=True)

    return {
        "success": True,
        "message": "Food entry deleted successfully"
    }

@app.route(
    "/api/users/<int:user_id>/journeys/<int:journey_id>/exercises",
    methods=["GET"]
)
def journey_exercise_history(user_id, journey_id):
    journey = get_journey_for_user(user_id, journey_id)

    if journey is None:
        return {
            "success": False,
            "message": "Journey not found"
        }, 404

    history = get_exercise_history(user_id, journey_id)

    return {
        "success": True,
        "message": "Journey exercise history fetched successfully",
        "journey": dict(journey),
        "exercises": [dict(row) for row in history]
    }


@app.route("/api/exercises", methods=["POST"])
def create_exercise_log():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    required_fields = [
        "user_id",
        "exercise_name",
        "duration_minutes",
        "calories_burned",
        "logged_date",
        "logged_time"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "User id, exercise name, duration, calories burned, date, and time are required"
            }, 400

    text_error = clean_text_fields(data, EXERCISE_TEXT_FIELDS)

    if text_error:
        return {
            "success": False,
            "message": text_error
        }, 400

    try:
        user_id = int(data["user_id"])
        data["duration_minutes"] = float(data["duration_minutes"])
        data["calories_burned"] = float(data["calories_burned"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id, duration, and calories burned must be numbers"
        }, 400

    if (
        user_id <= 0
        or data["duration_minutes"] <= 0
        or data["calories_burned"] <= 0
    ):
        return {
            "success": False,
            "message": "User id, duration, and calories burned must be positive"
        }, 400

    if not data["duration_minutes"] <= MAX_EXERCISE_MINUTES:
        return {
            "success": False,
            "message": f"Duration must be {MAX_EXERCISE_MINUTES} minutes or less"
        }, 400

    if not data["calories_burned"] <= MAX_EXERCISE_CALORIES:
        return {
            "success": False,
            "message": f"Calories burned must be {MAX_EXERCISE_CALORIES:,} kcal or less"
        }, 400

    try:
        parsed_date = date.fromisoformat(data["logged_date"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != data["logged_date"]:
        return {
            "success": False,
            "message": "Logged date must use YYYY-MM-DD format"
        }, 400

    try:
        parsed_time = time.fromisoformat(data["logged_time"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged time must be a real time in HH:MM format"
        }, 400

    if parsed_time.strftime("%H:%M") != data["logged_time"]:
        return {
            "success": False,
            "message": "Logged time must use HH:MM format"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    try:
        exercise_id = save_exercise_log(user_id, journey["id"], data)
    except sqlite3.IntegrityError:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    return {
        "success": True,
        "message": "Exercise recorded successfully",
        "exercise": {
            "id": exercise_id,
            "user_id": user_id,
            "journey_id": journey["id"],
            "exercise_name": data["exercise_name"],
            "category": data.get("category"),
            "duration_minutes": data["duration_minutes"],
            "calories_burned": data["calories_burned"],
            "logged_date": data["logged_date"],
            "logged_time": data["logged_time"],
            "notes": data.get("notes")
        }
    }

@app.route("/api/exercises/history/<int:user_id>", methods=["GET"])
def exercise_history(user_id):
    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    history = get_exercise_history(user_id, journey["id"])

    return {
        "success": True,
        "message": "Exercise history fetched successfully",
        "history": [dict(row) for row in history]
    }

@app.route("/api/exercises/<int:user_id>", methods=["GET"])
def exercises_by_date(user_id):
    logged_date = request.args.get("date")

    if not logged_date:
        return {
            "success": False,
            "message": "Date query parameter is required"
        }, 400

    try:
        parsed_date = date.fromisoformat(logged_date)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != logged_date:
        return {
            "success": False,
            "message": "Date must use YYYY-MM-DD format"
        }, 400

    # The calendar views every journey; logging pages stay on the active one.
    if request.args.get("all_journeys") == "1":
        journey_id = None
    else:
        journey = get_active_journey(user_id)

        if journey is None:
            return {
                "success": False,
                "message": "Active journey not found. Create a plan first"
            }, 404

        journey_id = journey["id"]

    exercise_logs = get_exercise_logs_by_date(user_id, journey_id, logged_date)
    total_duration = sum(row["duration_minutes"] for row in exercise_logs)
    total_calories = sum(row["calories_burned"] for row in exercise_logs)

    return {
        "success": True,
        "message": "Exercise logs fetched successfully",
        "date": logged_date,
        "exercises": [dict(row) for row in exercise_logs],
        "summary": {
            "entry_count": len(exercise_logs),
            "total_duration_minutes": total_duration,
            "total_calories_burned": total_calories
        }
    }

@app.route("/api/exercises/<int:exercise_id>", methods=["PUT"])
def update_exercise_entry(exercise_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    required_fields = [
        "user_id",
        "exercise_name",
        "duration_minutes",
        "calories_burned",
        "logged_date",
        "logged_time"
    ]

    for field in required_fields:
        if field not in data or data[field] in ("", None):
            return {
                "success": False,
                "message": "User id, exercise name, duration, calories burned, date, and time are required"
            }, 400

    text_error = clean_text_fields(data, EXERCISE_TEXT_FIELDS)

    if text_error:
        return {
            "success": False,
            "message": text_error
        }, 400

    try:
        user_id = int(data["user_id"])
        data["duration_minutes"] = float(data["duration_minutes"])
        data["calories_burned"] = float(data["calories_burned"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id, duration, and calories burned must be numbers"
        }, 400

    if (
        user_id <= 0
        or data["duration_minutes"] <= 0
        or data["calories_burned"] <= 0
    ):
        return {
            "success": False,
            "message": "User id, duration, and calories burned must be positive"
        }, 400

    if not data["duration_minutes"] <= MAX_EXERCISE_MINUTES:
        return {
            "success": False,
            "message": f"Duration must be {MAX_EXERCISE_MINUTES} minutes or less"
        }, 400

    if not data["calories_burned"] <= MAX_EXERCISE_CALORIES:
        return {
            "success": False,
            "message": f"Calories burned must be {MAX_EXERCISE_CALORIES:,} kcal or less"
        }, 400

    try:
        parsed_date = date.fromisoformat(data["logged_date"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged date must be a real date in YYYY-MM-DD format"
        }, 400

    if parsed_date.isoformat() != data["logged_date"]:
        return {
            "success": False,
            "message": "Logged date must use YYYY-MM-DD format"
        }, 400

    try:
        parsed_time = time.fromisoformat(data["logged_time"])
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "Logged time must be a real time in HH:MM format"
        }, 400

    if parsed_time.strftime("%H:%M") != data["logged_time"]:
        return {
            "success": False,
            "message": "Logged time must use HH:MM format"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    updated_rows = update_exercise_log(
        exercise_id,
        user_id,
        journey["id"],
        data
    )

    if updated_rows == 0:
        return {
            "success": False,
            "message": "Exercise entry not found"
        }, 404

    return {
        "success": True,
        "message": "Exercise entry updated successfully",
        "exercise": {
            "id": exercise_id,
            "user_id": user_id,
            "exercise_name": data["exercise_name"],
            "category": data.get("category"),
            "duration_minutes": data["duration_minutes"],
            "calories_burned": data["calories_burned"],
            "logged_date": data["logged_date"],
            "logged_time": data["logged_time"],
            "notes": data.get("notes")
        }
    }

@app.route("/api/exercises/<int:exercise_id>", methods=["DELETE"])
def delete_exercise_entry(exercise_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return {
            "success": False,
            "message": "Request body must be a JSON object"
        }, 400

    user_id = data.get("user_id")

    if user_id in ("", None):
        return {
            "success": False,
            "message": "User id is required"
        }, 400

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {
            "success": False,
            "message": "User id must be a number"
        }, 400

    if user_id <= 0:
        return {
            "success": False,
            "message": "User id must be positive"
        }, 400

    journey = get_active_journey(user_id)

    if journey is None:
        return {
            "success": False,
            "message": "Active journey not found. Create a plan first"
        }, 404

    deleted_rows = delete_exercise_log(exercise_id, user_id, journey["id"])

    if deleted_rows == 0:
        return {
            "success": False,
            "message": "Exercise entry not found"
        }, 404

    return {
        "success": True,
        "message": "Exercise entry deleted successfully"
    }

if __name__ == "__main__":
    app.run(debug=not PRODUCTION and os.environ.get("FLASK_DEBUG") == "1")
