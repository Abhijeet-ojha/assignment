from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from app.models.task import Task


def compute_user_task_analytics(user_id):
    tasks = (
        Task.query.filter_by(user_id=user_id)
        .with_entities(Task.id, Task.title, Task.status, Task.priority, Task.created_at)
        .all()
    )

    if not tasks:
        return _empty_analytics()

    records = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "created_at": t.created_at,
        }
        for t in tasks
    ]
    frame = pd.DataFrame(records)

    # --- Core counts ---
    total_tasks = int(frame.shape[0])
    is_completed = frame["status"].str.lower() == "completed"
    completed_tasks = int(is_completed.sum())
    pending_tasks = int(total_tasks - completed_tasks)

    completion_percentage = float(np.round((completed_tasks / total_tasks) * 100.0, 2))

    # --- Status distribution ---
    status_counts = frame["status"].value_counts().to_dict()
    status_distribution = {str(k): int(v) for k, v in status_counts.items()}

    # --- Priority distribution ---
    priority_counts = frame["priority"].value_counts().to_dict()
    priority_distribution = {str(k): int(v) for k, v in priority_counts.items()}

    # --- High priority ratio ---
    high_count = int((frame["priority"].str.lower() == "high").sum())
    high_priority_ratio = float(np.round((high_count / total_tasks) * 100.0, 2))

    # --- Priority completion ratios ---
    priority_completion = {}
    for prio in frame["priority"].unique():
        mask = frame["priority"] == prio
        prio_total = int(mask.sum())
        prio_completed = int((mask & is_completed).sum())
        ratio = float(np.round((prio_completed / prio_total) * 100.0, 2)) if prio_total else 0.0
        priority_completion[str(prio)] = {
            "total": prio_total,
            "completed": prio_completed,
            "ratio": ratio,
        }

    # --- Daily task creation frequency ---
    frame["date"] = pd.to_datetime(frame["created_at"]).dt.date
    daily_counts = frame.groupby("date").size()
    avg_tasks_per_day = float(np.round(np.mean(daily_counts.values), 2))

    # --- Recent completions (last 7 days) ---
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    recent_mask = pd.to_datetime(frame["created_at"]) >= seven_days_ago
    recent_completions = int((recent_mask & is_completed).sum())

    # --- Completion velocity (completed per day over active period) ---
    if len(daily_counts) > 1:
        date_range_days = (daily_counts.index[-1] - daily_counts.index[0]).days or 1
        completion_velocity = float(np.round(completed_tasks / date_range_days, 2))
    else:
        completion_velocity = float(completed_tasks)

    # --- Productivity score (weighted 0-100) ---
    #   completed tasks contribute 1.0, pending 0.3
    #   normalized against total possible (total * 1.0)
    raw_score = (completed_tasks * 1.0) + (pending_tasks * 0.3)
    max_score = total_tasks * 1.0
    productivity_score = float(np.round((raw_score / max_score) * 100.0, 2)) if max_score else 0.0

    # --- Streak: consecutive days with at least 1 task created (ending today) ---
    today = now.date()
    sorted_dates = sorted(set(daily_counts.index), reverse=True)
    streak_days = 0
    check_date = today
    for d in sorted_dates:
        if d == check_date:
            streak_days += 1
            check_date -= timedelta(days=1)
        elif d < check_date:
            break

    return {
        # core
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "completion_percentage": completion_percentage,
        # distributions
        "status_distribution": status_distribution,
        "priority_distribution": priority_distribution,
        # ratios
        "high_priority_ratio": high_priority_ratio,
        "priority_completion": priority_completion,
        # velocity & trends
        "avg_tasks_per_day": avg_tasks_per_day,
        "recent_completions": recent_completions,
        "completion_velocity": completion_velocity,
        # productivity
        "productivity_score": productivity_score,
        "streak_days": streak_days,
    }


def _empty_analytics():
    return {
        "total_tasks": 0,
        "completed_tasks": 0,
        "pending_tasks": 0,
        "completion_percentage": 0.0,
        "status_distribution": {},
        "priority_distribution": {},
        "high_priority_ratio": 0.0,
        "priority_completion": {},
        "avg_tasks_per_day": 0.0,
        "recent_completions": 0,
        "completion_velocity": 0.0,
        "productivity_score": 0.0,
        "streak_days": 0,
    }
