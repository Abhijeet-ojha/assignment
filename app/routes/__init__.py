from app.routes.analytics import analytics_bp
from app.routes.auth import auth_bp
from app.routes.health import health_bp
from app.routes.pages import pages_bp
from app.routes.tasks import tasks_bp

__all__ = ["health_bp", "auth_bp", "tasks_bp", "analytics_bp", "pages_bp"]
