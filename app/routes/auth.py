from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required

from app import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


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


def _user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _parse_identity():
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = _normalize_str(data.get("username"))
    email = _normalize_str(data.get("email"))
    password = _normalize_str(data.get("password"))

    if not username or not email or not password:
        return _json_error("username, email, and password are required", 400)

    normalized_email = email.lower()
    existing = User.query.filter_by(email=normalized_email).first()
    if existing:
        return _json_error("email already registered", 409)

    user = User(username=username, email=normalized_email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return _json_success(_user_payload(user), 201, "registration successful")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = _normalize_str(data.get("email"))
    password = _normalize_str(data.get("password"))

    if not email or not password:
        return _json_error("email and password are required", 400)

    user = User.query.filter_by(email=email.lower()).first()
    if not user or not user.check_password(password):
        return _json_error("invalid credentials", 401)

    token = create_access_token(identity=str(user.id))
    return _json_success(
        {"access_token": token, "user": _user_payload(user)},
        200,
        "login successful",
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = _parse_identity()
    if not user_id:
        return _json_error("invalid token", 401)
    user = User.query.get(user_id)
    if not user:
        return _json_error("user not found", 404)

    return _json_success({"user": _user_payload(user)}, 200, "user profile")
