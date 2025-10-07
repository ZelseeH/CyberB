from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import db, User, PasswordSettings, PasswordHistory
import re
import jwt
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
CORS(app)


def generate_token(user_id, username, is_admin):
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


def verify_token(token):
    """Weryfikuje JWT token"""
    try:
        payload = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Dekorator wymagający ważnego tokenu"""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Brak tokenu autoryzacyjnego"}), 401

        if token.startswith("Bearer "):
            token = token[7:]

        payload = verify_token(token)
        if not payload:
            return (
                jsonify(
                    {
                        "error": "Token wygasł lub jest nieprawidłowy. Zaloguj się ponownie."
                    }
                ),
                401,
            )

        user = User.query.get(payload["user_id"])
        if not user or user.is_blocked:
            return jsonify({"error": "Użytkownik nieaktywny lub zablokowany"}), 401

        return f(payload["user_id"], *args, **kwargs)

    return decorated


def admin_required(f):
    """Dekorator wymagający uprawnień administratora"""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Brak tokenu autoryzacyjnego"}), 401

        if token.startswith("Bearer "):
            token = token[7:]

        payload = verify_token(token)
        if not payload:
            return (
                jsonify(
                    {
                        "error": "Token wygasł lub jest nieprawidłowy. Zaloguj się ponownie."
                    }
                ),
                401,
            )

        if not payload.get("is_admin"):
            return jsonify({"error": "Brak uprawnień administratora"}), 403

        user = User.query.get(payload["user_id"])
        if not user or user.is_blocked:
            return jsonify({"error": "Użytkownik nieaktywny lub zablokowany"}), 401

        return f(*args, **kwargs)

    return decorated


def validate_password(password, settings=None):
    """Walidacja hasła według ustawień"""
    if settings is None:
        settings = PasswordSettings.query.first()

    errors = []

    if len(password) < settings.min_length:
        errors.append(f"Hasło musi mieć co najmniej {settings.min_length} znaków")

    if settings.require_capital_letter == 1 and not re.search(r"[A-Z]", password):
        errors.append("Hasło musi zawierać co najmniej jedną wielką literę")

    if settings.require_special_char == 1 and not re.search(
        r'[!@#$%^&*(),.?":{}|<>]', password
    ):
        errors.append("Hasło musi zawierać co najmniej jeden znak specjalny")

    if settings.require_digits > 0:
        digits = len(re.findall(r"\d", password))
        if digits < settings.require_digits:
            errors.append(
                f"Hasło musi zawierać co najmniej {settings.require_digits} cyfr(y)"
            )

    return errors


@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({"message": "Backend działa!", "status": "OK"})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"error": "Login lub Hasło niepoprawny"}), 401

    if user.is_blocked:
        return jsonify({"error": "Konto zablokowane"}), 403

    if not user.check_password(password):
        return jsonify({"error": "Login lub Hasło niepoprawny"}), 401

    password_expired = user.is_password_expired()

    token = generate_token(user.id, user.username, user.is_admin)

    return jsonify(
        {
            "success": True,
            "token": token,
            "expires_in": 900,
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "is_admin": user.is_admin,
                "must_change_password": user.must_change_password or password_expired,
                "password_expired": password_expired,
            },
        }
    )


@app.route("/api/verify-token", methods=["GET"])
@token_required
def verify_token_endpoint(current_user_id):
    """Sprawdza czy token jest ważny"""
    user = User.query.get(current_user_id)

    if not user or user.is_blocked:
        return jsonify({"error": "Użytkownik nieaktywny"}), 401

    return jsonify({"valid": True, "user": user.to_dict()})


@app.route("/api/user/profile", methods=["GET"])
@token_required
def get_user_profile(current_user_id):
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "is_blocked": user.is_blocked,
            "password_expiry_days": user.password_expiry_days,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_password_change": (
                user.last_password_change.isoformat()
                if user.last_password_change
                else None
            ),
            "must_change_password": user.must_change_password,
        }
    )


@app.route("/api/logout", methods=["POST"])
def logout():
    """Wylogowanie - token jest usuwany po stronie frontendu"""
    return jsonify({"success": True, "message": "Wylogowano pomyślnie"})


@app.route("/api/change-password", methods=["POST"])
@token_required
def change_password(current_user_id):
    data = request.get_json()
    user_id = data.get("user_id")
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    if current_user_id != user_id:
        return (
            jsonify({"error": "Brak uprawnień do zmiany hasła tego użytkownika"}),
            403,
        )

    if not user.check_password(old_password):
        return jsonify({"error": "Stare hasło niepoprawne"}), 401

    errors = validate_password(new_password)
    if errors:
        return jsonify({"error": errors}), 400

    if user.check_password_in_history(new_password):
        return jsonify({"error": "To hasło było już używane. Wybierz nowe hasło."}), 400

    history_entry = PasswordHistory(user_id=user.id, password_hash=user.password_hash)
    db.session.add(history_entry)

    user.set_password(new_password)
    user.last_password_change = datetime.utcnow()
    user.must_change_password = 0

    db.session.commit()

    return jsonify({"success": True, "message": "Hasło zmienione pomyślnie"})


@app.route("/api/password-settings", methods=["GET"])
@token_required
def get_password_settings(current_user_id):
    settings = PasswordSettings.query.first()
    return jsonify(settings.to_dict() if settings else {})


@app.route("/api/password-settings", methods=["PUT"])
@admin_required
def update_password_settings():
    data = request.get_json()
    settings = PasswordSettings.query.first()

    if not settings:
        settings = PasswordSettings()
        db.session.add(settings)

    settings.min_length = data.get("min_length", 8)
    settings.require_capital_letter = data.get("require_capital_letter", 1)
    settings.require_special_char = data.get("require_special_char", 1)
    settings.require_digits = data.get("require_digits", 1)

    db.session.commit()

    return jsonify({"success": True, "message": "Ustawienia zaktualizowane"})


@app.route("/api/users", methods=["GET"])
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])


@app.route("/api/users", methods=["POST"])
@admin_required
def create_user():
    data = request.get_json()

    existing_user = User.query.filter_by(username=data["username"]).first()
    if existing_user:
        return jsonify({"error": "Użytkownik o tej nazwie już istnieje"}), 400

    new_user = User(
        username=data["username"],
        full_name=data.get("full_name", ""),
        is_admin=data.get("is_admin", 0),
        password_expiry_days=data.get("password_expiry_days", 90),
        must_change_password=1,
    )
    new_user.set_password("User123!")

    db.session.add(new_user)
    db.session.commit()

    return (
        jsonify(
            {
                "success": True,
                "user_id": new_user.id,
                "message": "Użytkownik utworzony. Domyślne hasło: User123!",
            }
        ),
        201,
    )


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    data = request.get_json()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    user.full_name = data.get("full_name", user.full_name)
    user.password_expiry_days = data.get(
        "password_expiry_days", user.password_expiry_days
    )

    db.session.commit()

    return jsonify({"success": True, "message": "Użytkownik zaktualizowany"})


@app.route("/api/users/<int:user_id>/block", methods=["PUT"])
@admin_required
def block_user(user_id):
    data = request.get_json()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    user.is_blocked = data.get("is_blocked", 0)
    db.session.commit()

    status = "zablokowany" if user.is_blocked else "odblokowany"
    return jsonify({"success": True, "message": f"Użytkownik {status}"})


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    if user.username == "ADMIN":
        return jsonify({"error": "Nie można usunąć konta administratora"}), 403

    db.session.delete(user)
    db.session.commit()

    return jsonify({"success": True, "message": "Użytkownik usunięty"})


@app.route("/api/users/<int:user_id>/reset-password", methods=["PUT"])
@admin_required
def reset_user_password(user_id):
    data = request.get_json()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    new_password = data.get("new_password", "User123!")

    errors = validate_password(new_password)
    if errors:
        return jsonify({"error": errors}), 400

    history_entry = PasswordHistory(user_id=user.id, password_hash=user.password_hash)
    db.session.add(history_entry)

    user.set_password(new_password)
    user.last_password_change = datetime.utcnow()
    user.must_change_password = 1

    db.session.commit()

    return jsonify(
        {"success": True, "message": "Hasło użytkownika zostało zresetowane"}
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
