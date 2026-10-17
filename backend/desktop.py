"""Local-only entry point packaged as CutSmart.exe."""
import argparse
import os
from pathlib import Path
import sys
import threading
import webbrowser


def main():
    parser = argparse.ArgumentParser(description="Run CutSmart on this computer")
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--data-dir", type=Path)
    args = parser.parse_args()
    directory = args.data_dir or Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "CutSmart"
    os.environ["CUTSMART_DATA_DIR"] = str(directory.resolve())
    # A downloaded desktop app must not inherit cloud HTTPS/proxy settings.
    os.environ["CUTSMART_ENV"] = "local"
    os.environ.pop("FLASK_DEBUG", None)

    from app import app
    from config import FRONTEND_DIR
    from waitress.server import create_server

    if not (FRONTEND_DIR / "index.html").is_file():
        raise RuntimeError("Application files are missing. Extract the entire ZIP again.")
    server = create_server(app, host="127.0.0.1", port=args.port, threads=4,
                           clear_untrusted_proxy_headers=True)
    url = f"http://127.0.0.1:{server.effective_port}"
    print(f"CutSmart is running at {url}", flush=True)
    print(f"Your records and photos: {directory.resolve()}", flush=True)
    print("Keep this window open. Press Ctrl+C or close it to stop CutSmart.", flush=True)
    if not args.no_browser:
        timer = threading.Timer(1, webbrowser.open, args=(url,))
        timer.daemon = True
        timer.start()
    try:
        server.run()
    finally:
        server.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as error:
        print(f"CutSmart could not start: {error}", file=sys.stderr, flush=True)
        if "--no-browser" not in sys.argv:
            input("Press Enter to close...")
        sys.exit(1)
