from flask import Flask
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy

from config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO(cors_allowed_origins="*")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    # Initialize Flask-Migrate with the app and the SQLAlchemy db
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app)

    # Import models so they are registered with SQLAlchemy before migrations run.
    # Use importlib.import_module to avoid binding the name `app` (which would
    # shadow the Flask application instance during this function).
    with app.app_context():
        try:
            import importlib

            importlib.import_module("app.models")
        except Exception as e:
            # Import failure should surface so migrations don't run with missing models
            raise

    # NOTE: Avoid performing DB connectivity checks at import time since that
    # prevents CLI tasks (migrations) from running when the DB is intentionally
    # offline. Use the helper `check_db_connection()` at runtime or during
    # deployment health checks instead.

    # Register routes/blueprints
    from app.routes import health_bp, auth_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)

    return app
