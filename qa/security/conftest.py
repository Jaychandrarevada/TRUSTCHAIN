"""
Bridges the backend's test fixtures (app, client, approved_institution) into
the qa/security suite so it can run standalone from the backend venv.

Run from backend/:  pytest ../qa/security/
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2] / "backend"
sys.path.insert(0, str(BACKEND))

# Re-export every fixture defined in the backend conftest.
from tests.conftest import app, approved_institution, client  # noqa: F401,E402
