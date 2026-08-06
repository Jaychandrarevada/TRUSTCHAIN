"""Gunicorn entrypoint: `gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app`."""
from app import create_app

app = create_app()

if __name__ == "__main__":  # local dev convenience
    app.run(host="127.0.0.1", port=5000, debug=True)
