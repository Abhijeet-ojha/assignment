from flask import Blueprint, redirect, render_template, url_for

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
def index():
    return redirect(url_for("pages.dashboard"))


@pages_bp.route("/login")
def login_page():
    return render_template("login.html")


@pages_bp.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")
