from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db, socketio
from app.models.task import Task


tasks_bp = Blueprint("tasks", __name__, url_prefix="/tasks")


def _json_error(message, status_code, details=None):
    payload = {"success": False, "message": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status_code


def _json_success(data, status_code=200, message="ok"):
    return jsonify({"success": True, "message": message, "data": data}), status_code


def _normalize_str(value):
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped if stripped else None


def _task_payload(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "user_id": task.user_id,
    }


def _get_user_id():
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


def _emit_task_event(event_name, task):
    socketio.emit(event_name, {"task": _task_payload(task)})


@tasks_bp.route("", methods=["POST"])
@jwt_required()
def create_task():
    data = request.get_json(silent=True) or {}
    title = _normalize_str(data.get("title"))
    description = data.get("description")
    priority = _normalize_str(data.get("priority"))
    status = _normalize_str(data.get("status"))

    if not title:
        return _json_error("title is required", 400)

    if description is not None and not isinstance(description, str):
        return _json_error("description must be a string", 400)

    user_id = _get_user_id()
    if not user_id:
        return _json_error("invalid token", 401)
    task = Task(
        title=title,
        description=description,
        priority=priority or "Medium",
        status=status or "Pending",
        user_id=user_id,
    )

    db.session.add(task)
    db.session.commit()

    _emit_task_event("task_created", task)

    return _json_success(_task_payload(task), 201, "task created")


@tasks_bp.route("", methods=["GET"])
@jwt_required()
def list_tasks():
    user_id = _get_user_id()
    if not user_id:
        return _json_error("invalid token", 401)
    status = _normalize_str(request.args.get("status"))
    priority = _normalize_str(request.args.get("priority"))

    query = Task.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)

    tasks = query.order_by(Task.created_at.desc()).all()
    return _json_success([_task_payload(task) for task in tasks], 200, "tasks retrieved")


@tasks_bp.route("/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    user_id = _get_user_id()
    if not user_id:
        return _json_error("invalid token", 401)
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return _json_error("task not found", 404)

    data = request.get_json(silent=True) or {}
    updates = {}

    if "title" in data:
        title = _normalize_str(data.get("title"))
        if not title:
            return _json_error("title cannot be empty", 400)
        updates["title"] = title

    if "description" in data:
        description = data.get("description")
        if description is not None and not isinstance(description, str):
            return _json_error("description must be a string", 400)
        updates["description"] = description

    if "priority" in data:
        priority = _normalize_str(data.get("priority"))
        if not priority:
            return _json_error("priority cannot be empty", 400)
        updates["priority"] = priority

    if "status" in data:
        status = _normalize_str(data.get("status"))
        if not status:
            return _json_error("status cannot be empty", 400)
        updates["status"] = status

    if not updates:
        return _json_error("no valid fields to update", 400)

    for key, value in updates.items():
        setattr(task, key, value)

    db.session.commit()
    _emit_task_event("task_updated", task)
    return _json_success(_task_payload(task), 200, "task updated")


@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id):
    user_id = _get_user_id()
    if not user_id:
        return _json_error("invalid token", 401)
    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return _json_error("task not found", 404)

    db.session.delete(task)
    db.session.commit()
    _emit_task_event("task_deleted", task)
    return _json_success({"id": task_id}, 200, "task deleted")
