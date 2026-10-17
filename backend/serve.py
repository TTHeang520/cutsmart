"""Run the compiled frontend and API together using Waitress."""
import os

from waitress import serve
from app import app
from config import FRONTEND_DIR


if __name__ == "__main__":
    if not (FRONTEND_DIR / "index.html").is_file():
        raise RuntimeError("Build frontend first: cd frontend && npm ci && npm run build")
    options = {}
    proxy = os.environ.get("CUTSMART_TRUSTED_PROXY")
    if proxy:
        if proxy == "*":
            raise RuntimeError("Configure a specific trusted proxy address, not *")
        options.update(trusted_proxy=proxy, trusted_proxy_count=1,
                       trusted_proxy_headers={"x-forwarded-for", "x-forwarded-proto"})
    serve(app, host=os.environ.get("HOST", "127.0.0.1"),
          port=int(os.environ.get("PORT", "8080")), threads=4,
          clear_untrusted_proxy_headers=True, **options)
