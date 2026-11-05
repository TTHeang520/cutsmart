"""Entry point for hosting CutSmart on PythonAnywhere.

PythonAnywhere starts the website from its own WSGI file (linked on the Web tab).
That file only needs these lines; everything else lives here, under version control:

    import sys
    sys.path.insert(0, "/home/<your-username>/cutsmart/backend")
    from pythonanywhere_wsgi import application

Expected layout in your PythonAnywhere home directory:

    ~/cutsmart/          this repository (git clone)
    ~/cutsmart/frontend/dist/   the built React site (uploaded, see docs/PYTHONANYWHERE.md)
    ~/cutsmart-data/     database and food photos; never inside the repository,
                         so pulling new code can never overwrite users' data
"""
import os
from pathlib import Path

# setdefault lets the PythonAnywhere WSGI file override any of these if ever needed.
os.environ.setdefault("CUTSMART_ENV", "production")
os.environ.setdefault("CUTSMART_DATA_DIR", str(Path.home() / "cutsmart-data"))
# PythonAnywhere's own proxy sits in front of the app and handles HTTPS; trust
# exactly one hop so each visitor gets their own login rate limit.
os.environ.setdefault("CUTSMART_PROXY_HOPS", "1")

from app import app as application  # noqa: E402  (environment must be set first)
