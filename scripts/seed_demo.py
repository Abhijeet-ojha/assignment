from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app, db
from app.models.task import Task
from app.models.user import User


def seed_demo():
    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email="demo@smarttasks.com").first()
        if not user:
            user = User(username="demo", email="demo@smarttasks.com")
            user.set_password("DemoPass123")
            db.session.add(user)
            db.session.commit()

        Task.query.filter_by(user_id=user.id).delete()

        tasks = [
            Task(title="Plan product sprint", description="Outline Q3 roadmap", priority="High", status="Pending", user_id=user.id),
            Task(title="Review PRs", description="Frontend polish updates", priority="Medium", status="Completed", user_id=user.id),
            Task(title="Client follow-up", description="Send recap email", priority="Low", status="Pending", user_id=user.id),
        ]

        db.session.add_all(tasks)
        db.session.commit()
        print("Demo data seeded for demo@smarttasks.com / DemoPass123")


if __name__ == "__main__":
    seed_demo()
