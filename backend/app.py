# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import db, User, PasswordSettings, PasswordHistory, SystemSettings
import re
import jwt
from datetime import datetime, timedelta
from functools import wraps
from models import db, User, PasswordSettings, PasswordHistory, Log, SystemSettings

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
CORS(app)

with app.app_context():
    db.create_all()
    if PasswordSettings.query.first() is None:
        db.session.add(PasswordSettings())
    if SystemSettings.query.first() is None:
        db.session.add(SystemSettings())
    db.session.commit()


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
    otp_answer = data.get("otp_answer")
    ip_address = request.remote_addr

    user = User.query.filter_by(username=username).first()

    if not user:
        log_action(username or "unknown", "login_failed", "User not found", ip_address)
        return jsonify({"error": "Login lub Hasło niepoprawny"}), 401

    if user.is_blocked:
        log_action(username, "login_failed", "Account blocked", ip_address)
        return jsonify({"error": "Konto zablokowane"}), 403

    if user.is_locked_out():
        log_action(username, "login_failed", "Account locked out", ip_address)
        return jsonify({"error": "Konto tymczasowo zablokowane. Spróbuj ponownie za 15 minut."}), 403

    # Sprawdź czy użytkownik ma włączone hasło jednorazowe
    if user.one_time_password_enabled:
        if not otp_answer:
            # Zwróć informację o potrzebie OTP
            return jsonify({
                "requires_otp": True
            })
        
        # Weryfikuj odpowiedź hasła jednorazowego
        if not user.verify_one_time_password(otp_answer):
            user.record_failed_attempt()
            log_action(username, "login_failed", "Invalid OTP answer", ip_address)
            return jsonify({"error": "Niepoprawna odpowiedź hasła jednorazowego"}), 401
        
        # Po poprawnym użyciu hasła jednorazowego, wyłącz je
        user.disable_one_time_password()
        user.reset_failed_attempts()
        db.session.commit()
        
        # Wymuś zmianę hasła po użyciu OTP
        user.must_change_password = 1
        db.session.commit()
    else:
        # Standardowa weryfikacja hasła
        if not user.check_password(password):
            user.record_failed_attempt()
            log_action(username, "login_failed", "Invalid password", ip_address)
            return jsonify({"error": "Login lub Hasło niepoprawny"}), 401
        user.reset_failed_attempts()

    password_expired = user.is_password_expired()
    token = generate_token(user.id, user.username, user.is_admin)
    
    log_action(username, "login_success", None, ip_address)

    return jsonify({
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
    })


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
@token_required
def logout(current_user_id):
    """Wylogowanie - token jest usuwany po stronie frontendu"""
    user = User.query.get(current_user_id)
    log_action(user.username if user else "unknown", "logout", None, request.remote_addr)
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
        return jsonify({"error": "Brak uprawnień do zmiany hasła tego użytkownika"}), 403

    if not (user.must_change_password and user.reset_with_otp):
        if not user.check_password(old_password):
            log_action(user.username, "password_changed", "Failed - incorrect old password", request.remote_addr)
            return jsonify({"error": "Stare hasło niepoprawne"}), 401

    errors = validate_password(new_password)
    if errors:
        return jsonify({"error": errors}), 400

    if user.check_password_in_history(new_password):
        log_action(user.username, "password_changed", "Failed - password reused", request.remote_addr)
        return jsonify({"error": "To hasło było już używane. Wybierz nowe hasło."}), 400

    if user.password_hash is not None:
        history_entry = PasswordHistory(user_id=user.id, password_hash=user.password_hash)
        db.session.add(history_entry)

    user.set_password(new_password)
    user.last_password_change = datetime.utcnow()
    user.must_change_password = 0
    user.reset_with_otp = False

    db.session.commit()
    
    log_action(user.username, "password_changed", "Password changed successfully", request.remote_addr)

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
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

    if not settings:
        settings = PasswordSettings()
        db.session.add(settings)

    settings.min_length = data.get("min_length", 8)
    settings.require_capital_letter = data.get("require_capital_letter", 1)
    settings.require_special_char = data.get("require_special_char", 1)
    settings.require_digits = data.get("require_digits", 1)

    db.session.commit()
    
    log_action(
        admin_user.username if admin_user else "ADMIN",
        "password_settings_updated",
        f"Updated password settings",
        request.remote_addr
    )

    return jsonify({"success": True, "message": "Ustawienia zaktualizowane"})


@app.route("/api/system-settings", methods=["GET"])
@token_required
def get_system_settings(current_user_id):
    settings = SystemSettings.query.first()
    return jsonify(settings.to_dict() if settings else {})


@app.route("/api/system-settings", methods=["PUT"])
@admin_required
def update_system_settings():
    data = request.get_json()
    settings = SystemSettings.query.first()
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

    if not settings:
        settings = SystemSettings()
        db.session.add(settings)

    settings.failed_login_limit = data.get("failed_login_limit", 5)
    settings.idle_timeout_minutes = data.get("idle_timeout_minutes", 15)

    db.session.commit()
    
    log_action(
        admin_user.username if admin_user else "ADMIN",
        "system_settings_updated",
        f"Updated system settings",
        request.remote_addr
    )

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
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

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
    
    use_otp = data.get("use_one_time_password", False)
    # Sprawdź czy włączyć hasło jednorazowe
    if use_otp:
        otp = data.get("one_time_password")
        if not otp:
            return jsonify({"error": "Hasło jednorazowe jest wymagane"}), 400
        new_user.set_one_time_password(otp)
        new_user.password_hash = None
        message = f"Użytkownik utworzony z hasłem jednorazowym"
    else:
        new_user.set_password("User123!")
        new_user.reset_with_otp = False
        message = "Użytkownik utworzony. Domyślne hasło: User123!"

    db.session.add(new_user)
    db.session.commit()
    
    log_action(
        admin_user.username if admin_user else "ADMIN",
        "user_created",
        f"Created user: {new_user.username}" + (" with OTP" if new_user.one_time_password_enabled else ""),
        request.remote_addr
    )

    response_data = {
        "success": True,
        "user_id": new_user.id,
        "message": message,
    }
    
    if use_otp:
        response_data["otp"] = otp
    
    return jsonify(response_data), 201


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    data = request.get_json()
    user = User.query.get(user_id)
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    user.full_name = data.get("full_name", user.full_name)
    user.password_expiry_days = data.get("password_expiry_days", user.password_expiry_days)
    
    use_otp = data.get("use_one_time_password", False)
    # Sprawdź czy włączyć hasło jednorazowe
    if use_otp:
        otp = data.get("one_time_password")
        if not otp:
            return jsonify({"error": "Hasło jednorazowe jest wymagane"}), 400
        user.set_one_time_password(otp)
        user.password_hash = None
        user.must_change_password = 1

    db.session.commit()
    
    log_action(
        admin_user.username if admin_user else "ADMIN",
        "user_updated",
        f"Updated user: {user.username}" + (" - OTP enabled" if use_otp else ""),
        request.remote_addr
    )

    response_data = {"success": True, "message": "Użytkownik zaktualizowany"}
    
    if use_otp:
        response_data["otp"] = otp
    
    return jsonify(response_data)


@app.route("/api/users/<int:user_id>/block", methods=["PUT"])
@admin_required
def block_user(user_id):
    data = request.get_json()
    user = User.query.get(user_id)
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    user.is_blocked = data.get("is_blocked", 0)
    db.session.commit()

    status = "zablokowany" if user.is_blocked else "odblokowany"
    action_type = "user_blocked" if user.is_blocked else "user_unblocked"
    
    log_action(
        admin_user.username if admin_user else "ADMIN",
        action_type,
        f"User {user.username} {status}",
        request.remote_addr
    )
    
    return jsonify({"success": True, "message": f"Użytkownik {status}"})


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    if user.username == "ADMIN":
        return jsonify({"error": "Nie można usunąć konta administratora"}), 403

    username = user.username
    db.session.delete(user)
    db.session.commit()
    
    log_action(
        admin_user.username if admin_user else "ADMIN",
        "user_deleted",
        f"Deleted user: {username}",
        request.remote_addr
    )

    return jsonify({"success": True, "message": "Użytkownik usunięty"})


@app.route("/api/users/<int:user_id>/reset-password", methods=["PUT"])
@admin_required
def reset_user_password(user_id):
    data = request.get_json()
    user = User.query.get(user_id)
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = verify_token(token)
    admin_user = User.query.get(payload["user_id"]) if payload else None

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    use_otp = data.get("use_one_time_password", False)
    
    if use_otp:
        # Ustaw hasło jednorazowe
        otp = data.get("one_time_password")
        if not otp:
            return jsonify({"error": "Hasło jednorazowe jest wymagane"}), 400
        user.set_one_time_password(otp)
        user.password_hash = None
        user.last_password_change = datetime.utcnow()
        user.must_change_password = 1
        
        db.session.commit()
        
        log_action(
            admin_user.username if admin_user else "ADMIN",
            "password_reset",
            f"Generated OTP for user: {user.username}",
            request.remote_addr
        )
        
        return jsonify({
            "success": True,
            "message": "Wygenerowano hasło jednorazowe",
            "otp": otp
        })
    else:
        # Standardowy reset hasła
        new_password = data.get("new_password", "User123!")
        
        errors = validate_password(new_password)
        if errors:
            return jsonify({"error": errors}), 400

        if user.password_hash is not None:
            history_entry = PasswordHistory(user_id=user.id, password_hash=user.password_hash)
            db.session.add(history_entry)

        user.set_password(new_password)
        user.last_password_change = datetime.utcnow()
        user.must_change_password = 1
        user.disable_one_time_password()  # Wyłącz OTP jeśli było włączone
        user.reset_with_otp = False

        db.session.commit()
        
        log_action(
            admin_user.username if admin_user else "ADMIN",
            "password_reset",
            f"Reset password for user: {user.username}",
            request.remote_addr
        )

        return jsonify({"success": True, "message": "Hasło użytkownika zostało zresetowane"})


def log_action(username, action_type, description=None, ip_address=None):
    """Zapisuje akcję użytkownika w logach"""
    try:
        log_entry = Log(
            username=username,
            action_type=action_type,
            description=description,
            ip_address=ip_address
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        print(f"Error logging action: {str(e)}")
        db.session.rollback()


@app.route("/api/logs", methods=["GET"])
@admin_required
def get_logs():
    """Pobiera wszystkie logi systemowe"""
    try:
        logs = Log.query.order_by(Log.created_at.desc()).all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        print(f"Error fetching logs: {str(e)}")
        return jsonify({"error": "Błąd podczas pobierania logów"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)