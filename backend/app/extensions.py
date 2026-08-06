"""
Flask extension singletons.

Dependency-injection strategy (Clean Architecture, pragmatic Flask flavor):
extensions are module-level singletons bound to the app in the factory;
SERVICES receive their dependencies through constructors and are exposed via
`app.services` (a simple container built in `app/__init__.py`). API handlers
depend on the container, never on concrete infrastructure — which is how the
test suite swaps the blockchain client for a mock (SOLID: DIP).
"""
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()
limiter = Limiter(key_func=get_remote_address, default_limits=["600 per minute"])
