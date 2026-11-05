"""Verify startup configuration without touching the developer's database."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class DeploymentTest(unittest.TestCase):
    def test_production_requires_persistent_directory(self):
        env = {**os.environ, "CUTSMART_ENV": "production"}
        env.pop("CUTSMART_DATA_DIR", None)
        result = subprocess.run([sys.executable, "-c", "import config"],
                                cwd=Path(__file__).parent, env=env,
                                capture_output=True, text=True, timeout=20)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("requires CUTSMART_DATA_DIR", result.stderr)

    def test_storage_survives_fresh_process(self):
        with tempfile.TemporaryDirectory() as folder:
            env = {**os.environ, "CUTSMART_ENV": "production", "CUTSMART_DATA_DIR": folder}
            for script in (
                "import app; from database import create_user; create_user('test', 'test@example.com', 'test-only'); assert app.app.config['SESSION_COOKIE_SECURE']",
                "import app; from database import get_user_from_email; assert get_user_from_email('test@example.com') is not None",
            ):
                result = subprocess.run([sys.executable, "-c", script],
                                        cwd=Path(__file__).parent, env=env,
                                        capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((Path(folder) / "cutsmart_database").is_file())
            self.assertTrue((Path(folder) / "uploads" / "food_photos").is_dir())

    def test_pythonanywhere_entry_point(self):
        """The hosted entry point uses production settings and per-visitor rate limits."""
        script = """
from werkzeug.test import Client
from pythonanywhere_wsgi import application
from app import app
assert app.config['SESSION_COOKIE_SECURE']
client = Client(application)
def login(ip):
    return client.post('/api/login', json={'email': 'x@example.com', 'password': 'wrong'},
                       headers={'X-CutSmart-Request': '1', 'X-Forwarded-For': ip,
                                'X-Forwarded-Proto': 'https'}).status_code
codes = [login('203.0.113.1') for _ in range(11)]
assert codes[:10] == [401] * 10 and codes[10] == 429, codes
# A different visitor behind the same proxy is not blocked by the first one.
assert login('203.0.113.2') == 401
"""
        with tempfile.TemporaryDirectory() as folder:
            env = {**os.environ, "CUTSMART_DATA_DIR": folder}
            for name in ("CUTSMART_ENV", "CUTSMART_PROXY_HOPS"):
                env.pop(name, None)
            result = subprocess.run([sys.executable, "-c", script],
                                    cwd=Path(__file__).parent, env=env,
                                    capture_output=True, text=True, timeout=60)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((Path(folder) / "cutsmart_database").is_file())
