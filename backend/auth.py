
"""Opaque, revocable login sessions and request ownership checks."""
import hashlib
import secrets
import time

from flask import g, request
from database import get_db_connection

COOKIE_NAME = "cutsmart_session"
SESSION_SECONDS = 8 * 60 * 60


def init_auth(app):
    with get_db_connection() as connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS auth_sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            csrf_token TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        )""")
    connection.close()
    connection = get_db_connection()
    try:
        connection.execute("""CREATE TABLE IF NOT EXISTS auth_limits (
            key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL
        )""")
        connection.commit()
    finally:
        connection.close()

    if app.extensions.get("cutsmart_auth"):
        return
    app.extensions["cutsmart_auth"] = True

    @app.before_request
    def authorize():
        if request.method == "OPTIONS" or not request.path.startswith("/api/"):
            return None
        if request.endpoint in ("login", "register") and request.method == "POST":
            retry = consume_auth_attempt(request.endpoint, request.remote_addr or "unknown")
            if retry:
                return ({"success": False, "message": "Too many attempts. Try again later."},
                        429, {"Retry-After": str(retry)})
        if request.method not in ("GET", "HEAD"):
            # Custom headers cannot be sent by a cross-site HTML form.
            if request.headers.get("X-CutSmart-Request") != "1":
                return {"success": False, "message": "Missing request header"}, 403
        if request.endpoint in ("login", "register", "test"):
            return None
        token = request.cookies.get(COOKIE_NAME, "")
        connection = get_db_connection()
        try:
            row = connection.execute(
                "SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ?",
                (hashlib.sha256(token.encode()).hexdigest(), int(time.time())),
            ).fetchone()
        finally:
            connection.close()
        if row is None:
            return {"success": False, "message": "Please log in"}, 401
        g.user_id = row["user_id"]
        g.session_hash = row["token_hash"]
        g.csrf_token = row["csrf_token"]
        if request.method not in ("GET", "HEAD") and not secrets.compare_digest(
            request.headers.get("X-CSRF-Token", ""), g.csrf_token
        ):
            return {"success": False, "message": "Invalid CSRF token"}, 403
        supplied = []
        for values in (request.view_args or {}, request.args, request.form):
            if "user_id" in values:
                supplied.append(values["user_id"])
        data = request.get_json(silent=True)
        if isinstance(data, dict) and "user_id" in data:
            supplied.append(data["user_id"])
        for value in supplied:
            if str(value) != str(g.user_id):
                return {"success": False, "message": "Access denied"}, 403


def issue_session(user_id):
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    connection = get_db_connection()
    try:
        connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (int(time.time()),))
        old = request.cookies.get(COOKIE_NAME, "")
        connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?",
                           (hashlib.sha256(old.encode()).hexdigest(),))
        connection.execute("INSERT INTO auth_sessions VALUES (?, ?, ?, ?)",
                           (hashlib.sha256(token.encode()).hexdigest(), user_id,
                            csrf, int(time.time()) + SESSION_SECONDS))
        connection.commit()
    finally:
        connection.close()
    return token, csrf


def consume_auth_attempt(endpoint, address):
    """Atomically count requests in a 15-minute window shared by server threads."""
    now = int(time.time())
    limit = 10 if endpoint == "login" else 5
    key = endpoint + ":" + hashlib.sha256(address.encode()).hexdigest()
    connection = get_db_connection()
    try:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute("DELETE FROM auth_limits WHERE expires_at <= ?", (now,))
        connection.execute("""INSERT INTO auth_limits VALUES (?, 1, ?)
            ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1""", (key, now + 900))
        row = connection.execute("SELECT * FROM auth_limits WHERE key = ?", (key,)).fetchone()
        connection.commit()
        return max(1, row["expires_at"] - now) if row["attempts"] > limit else 0
    finally:
        connection.close()
