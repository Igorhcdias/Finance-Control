"""Start the API with the bundled Python runtime, independent of its ._pth file."""
import argparse
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def main():
    parser = argparse.ArgumentParser(description="Inicia a API local usando backend/.env")
    parser.add_argument("--reload", action="store_true")
    parser.add_argument("--port", type=int, default=None)
    args = parser.parse_args()
    os.chdir(BACKEND_DIR)
    import uvicorn
    from app.config import get_settings

    uvicorn.run(
        "app.main:app", host="127.0.0.1",
        port=args.port if args.port is not None else get_settings().port,
        reload=args.reload,
        reload_dirs=[str(BACKEND_DIR / "app")] if args.reload else None,
    )


if __name__ == "__main__":
    main()
