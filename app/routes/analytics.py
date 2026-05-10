from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.analytics import compute_user_task_analytics


analytics_bp = Blueprint("analytics", __name__, url_prefix="/analytics")


def _json_error(message, status_code):
    return jsonify({"success": False, "message": message}), status_code


def _json_success(data, status_code=200, message="ok"):
    return jsonify({"success": True, "message": message, "data": data}), status_code


@analytics_bp.route("", methods=["GET"])
@jwt_required()
def get_analytics():
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return _json_error("invalid token", 401)
    data = compute_user_task_analytics(user_id)
    return _json_success(data, 200, "analytics retrieved")
