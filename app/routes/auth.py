from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from app import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"msg": "username, email and password required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"msg": "email already registered"}), 400

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"id": user.id, "email": user.email}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"msg": "invalid credentials"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"access_token": token}), 200
