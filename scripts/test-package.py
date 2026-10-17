"""Exercise the packaged EXE over HTTP with disposable data, then restart it."""
import argparse
import http.cookiejar
import json
import io
from PIL import Image
from pathlib import Path
import queue
import re
import subprocess
import tempfile
import threading
import urllib.request


def start(executable, data):
    process = subprocess.Popen([str(executable), "--no-browser", "--data-dir", str(data)],
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    lines = queue.Queue()
    def read():
        for line in process.stdout:
            lines.put(line)
    threading.Thread(target=read, daemon=True).start()
    try:
        while True:
            line = lines.get(timeout=60)
            match = re.search(r"http://127.0.0.1:\d+", line)
            if match:
                return process, match.group()
    except Exception:
        process.terminate()
        process.wait(timeout=15)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("executable", type=Path)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="cutsmart-package-") as folder:
        for first_run in (True, False):
            process, base = start(args.executable.resolve(), Path(folder))
            try:
                client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
                csrf = None
                def call(path, data=None):
                    headers = {"X-CutSmart-Request": "1"}
                    if csrf:
                        headers["X-CSRF-Token"] = csrf
                    body = None
                    if data is not None:
                        headers["Content-Type"] = "application/json"
                        body = json.dumps(data).encode()
                    with client.open(urllib.request.Request(base + path, body, headers), timeout=15) as response:
                        return response.read()
                html = call("/dashboard").decode()
                assert 'id="root"' in html
                for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html):
                    assert len(call(asset)) > 0
                credentials = {"email": "package@example.com", "password": "package-test-password"}
                if first_run:
                    call("/api/register", {**credentials, "username": "Package test"})
                login = json.loads(call("/api/login", credentials))
                csrf = login["csrf_token"]
                user_id = login["user"]["id"]
                if first_run:
                    inputs = {"age": 25, "gender": "male", "height_cm": 175,
                              "current_weight_kg": 80, "target_weight_kg": 72,
                              "daily_activity_level": "light_daily_movement", "strategy": "balanced"}
                    plan = json.loads(call("/api/plan", inputs))["plan"]
                    call("/api/plans/save", {"user_id": user_id, "input_data": inputs, "plan_result": plan})
                    call("/api/weights", {"user_id": user_id, "weight_kg": 79.75, "logged_date": "2026-10-18"})
                    food = json.loads(call("/api/foods", {"user_id": user_id,
                        "food_name": "Rice", "calories": 150, "meal_type": "lunch",
                        "logged_date": "2026-10-18", "logged_time": "12:00"}))["food"]
                    picture = io.BytesIO()
                    Image.new("RGB", (2, 2), "green").save(picture, format="PNG")
                    boundary = "CutSmartPackageTest"
                    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n{user_id}\r\n'
                            f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="test.png"\r\n'
                            'Content-Type: image/png\r\n\r\n').encode() + picture.getvalue() + f'\r\n--{boundary}--\r\n'.encode()
                    request = urllib.request.Request(base + f'/api/foods/{food["id"]}/photo', body,
                        {"Content-Type": f"multipart/form-data; boundary={boundary}",
                         "X-CutSmart-Request": "1", "X-CSRF-Token": csrf})
                    with client.open(request, timeout=15) as response:
                        photo_url = json.load(response)["photo_url"]
                assert call(photo_url).startswith(b"\x89PNG")
                history = json.loads(call(f"/api/weights/history/{user_id}"))["history"]
                assert len(history) == 2, history
                call("/api/logout", {})
                print("PASS packaged startup, assets, login, plan/weight/photo persistence, logout", flush=True)
            finally:
                process.terminate()
                process.wait(timeout=15)


if __name__ == "__main__":
    main()
