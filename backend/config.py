"""Filesystem configuration shared by the development and production servers."""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
PRODUCTION = os.environ.get("CUTSMART_ENV") == "production"
if PRODUCTION and not os.environ.get("CUTSMART_DATA_DIR"):
    raise RuntimeError("Production requires CUTSMART_DATA_DIR on persistent storage")
DATA_DIR = Path(os.environ.get("CUTSMART_DATA_DIR", str(BACKEND_DIR))).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_DIR = (Path(sys._MEIPASS) / "frontend" / "dist" if getattr(sys, "frozen", False)
                else BACKEND_DIR.parent / "frontend" / "dist")
