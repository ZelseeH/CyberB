from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import (
    db,
    User,
    PasswordSettings,
    PasswordHistory,
    SystemSettings,
    CaptchaQuestion,
    Log,
)
import re
import jwt
import requests
import random
from datetime import datetime, timedelta
from functools import wraps

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
    try:
        payload = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def verify_recaptcha(token):
    secret_key = app.config.get("RECAPTCHA_SECRET_KEY")
    if not secret_key or secret_key == "your-recaptcha-secret-key":
        return True
    try:
        response = requests.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": secret_key, "response": token},
            timeout=5,
        )
        return response.json().get("success", False)
    except Exception as e:
        print(f"reCAPTCHA error: {str(e)}")
        return False


def token_required(f):
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


def log_action(username, action_type, description=None, ip_address=None):
    try:
        log_entry = Log(
            username=username,
            action_type=action_type,
            description=description,
            ip_address=ip_address,
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        print(f"Error logging: {str(e)}")
        db.session.rollback()


def get_admin_from_token(token):
    token = token.replace("Bearer ", "")
    payload = verify_token(token)
    return User.query.get(payload["user_id"]) if payload else None


@app.route("/api/test", methods=["GET"])
def test():
    return jsonify({"message": "Backend działa!", "status": "OK"})


@app.route("/api/captcha/question", methods=["GET"])
def get_captcha_question():
    questions = CaptchaQuestion.query.filter_by(is_active=True).all()
    if not questions:
        return jsonify({"id": 0, "question": "Co jest stolicą Wielkiej Brytanii?"})
    question = random.choice(questions)
    return jsonify(question.to_dict())


@app.route("/api/captcha/verify", methods=["POST"])
def verify_captcha():
    data = request.get_json()
    question_id = data.get("question_id")
    user_answer = data.get("answer", "").strip().lower()
    if question_id == 0:
        is_correct = user_answer == "londyn"
    else:
        question = CaptchaQuestion.query.get(question_id)
        if not question:
            return jsonify({"error": "Nieprawidłowe pytanie CAPTCHA"}), 400
        is_correct = user_answer == question.answer.strip().lower()
    return jsonify({"valid": is_correct})


@app.route("/api/recaptcha/site-key", methods=["GET"])
def get_recaptcha_site_key():
    site_key = app.config.get("RECAPTCHA_SITE_KEY", "your-recaptcha-site-key")
    return jsonify({"site_key": site_key})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    otp_answer = data.get("otp_answer")
    captcha_question_id = data.get("captcha_question_id")
    captcha_answer = data.get("captcha_answer")
    ip_address = request.remote_addr

    if captcha_question_id is not None and captcha_answer is not None:
        user_answer = captcha_answer.strip().lower()
        if captcha_question_id == 0:
            if user_answer != "londyn":
                log_action(
                    username or "unknown", "login_failed", "Invalid CAPTCHA", ip_address
                )
                return jsonify({"error": "Nieprawidłowa odpowiedź CAPTCHA"}), 401
        else:
            question = CaptchaQuestion.query.get(captcha_question_id)
            if not question or user_answer != question.answer.strip().lower():
                log_action(
                    username or "unknown", "login_failed", "Invalid CAPTCHA", ip_address
                )
                return jsonify({"error": "Nieprawidłowa odpowiedź CAPTCHA"}), 401

    user = User.query.filter_by(username=username).first()
    if not user:
        log_action(username or "unknown", "login_failed", "User not found", ip_address)
        return jsonify({"error": "Login lub Hasło niepoprawny"}), 401
    if user.is_blocked:
        log_action(username, "login_failed", "Account blocked", ip_address)
        return jsonify({"error": "Konto zablokowane"}), 403
    if user.is_locked_out():
        log_action(username, "login_failed", "Account locked out", ip_address)
        return (
            jsonify(
                {"error": "Konto tymczasowo zablokowane. Spróbuj ponownie za 15 minut."}
            ),
            403,
        )

    if user.one_time_password_enabled:
        if not otp_answer:
            return jsonify({"requires_otp": True})
        if not user.verify_one_time_password(otp_answer):
            user.record_failed_attempt()
            log_action(username, "login_failed", "Invalid OTP answer", ip_address)
            return jsonify({"error": "Niepoprawna odpowiedź hasła jednorazowego"}), 401
        user.disable_one_time_password()
        user.reset_failed_attempts()
        user.must_change_password = 1
        db.session.commit()
    else:
        if not user.check_password(password):
            user.record_failed_attempt()
            log_action(username, "login_failed", "Invalid password", ip_address)
            return jsonify({"error": "Login lub Hasło niepoprawny"}), 401
        user.reset_failed_attempts()

    password_expired = user.is_password_expired()
    token = generate_token(user.id, user.username, user.is_admin)
    log_action(username, "login_success", None, ip_address)

    system_settings = SystemSettings.query.first()
    idle_timeout_minutes = (
        system_settings.idle_timeout_minutes if system_settings else 15
    )

    return jsonify(
        {
            "success": True,
            "token": token,
            "expires_in": 900,
            "idle_timeout_minutes": idle_timeout_minutes,
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
    user = User.query.get(current_user_id)
    log_action(
        user.username if user else "unknown", "logout", None, request.remote_addr
    )
    return jsonify({"success": True, "message": "Wylogowano pomyślnie"})


@app.route("/api/change-password", methods=["POST"])
@token_required
def change_password(current_user_id):
    data = request.get_json()
    user_id = data.get("user_id")
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    recaptcha_token = data.get("recaptcha_token")

    if recaptcha_token:
        if not verify_recaptcha(recaptcha_token):
            log_action(
                "unknown",
                "password_change_failed",
                "Invalid reCAPTCHA",
                request.remote_addr,
            )
            return (
                jsonify(
                    {"error": "Nieprawidłowa weryfikacja reCAPTCHA. Spróbuj ponownie."}
                ),
                401,
            )
    else:
        return jsonify({"error": "Wymagana weryfikacja reCAPTCHA"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404
    if current_user_id != user_id:
        return (
            jsonify({"error": "Brak uprawnień do zmiany hasła tego użytkownika"}),
            403,
        )

    if not (user.must_change_password and user.reset_with_otp):
        if not user.check_password(old_password):
            log_action(
                user.username,
                "password_changed",
                "Failed - incorrect old password",
                request.remote_addr,
            )
            return jsonify({"error": "Stare hasło niepoprawne"}), 401

    errors = validate_password(new_password)
    if errors:
        return jsonify({"error": errors}), 400
    if user.check_password_in_history(new_password):
        log_action(
            user.username,
            "password_changed",
            "Failed - password reused",
            request.remote_addr,
        )
        return jsonify({"error": "To hasło było już używane. Wybierz nowe hasło."}), 400

    if user.password_hash is not None:
        history_entry = PasswordHistory(
            user_id=user.id, password_hash=user.password_hash
        )
        db.session.add(history_entry)

    user.set_password(new_password)
    user.last_password_change = datetime.utcnow()
    user.must_change_password = 0
    user.reset_with_otp = False
    db.session.commit()

    log_action(
        user.username,
        "password_changed",
        "Password changed successfully",
        request.remote_addr,
    )
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
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

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
        "Updated password settings",
        request.remote_addr,
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
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

    if not settings:
        settings = SystemSettings()
        db.session.add(settings)

    settings.failed_login_limit = data.get("failed_login_limit", 5)
    settings.idle_timeout_minutes = data.get("idle_timeout_minutes", 15)
    db.session.commit()

    log_action(
        admin_user.username if admin_user else "ADMIN",
        "system_settings_updated",
        "Updated system settings",
        request.remote_addr,
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
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

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
    if use_otp:
        otp = data.get("one_time_password")
        if not otp:
            return jsonify({"error": "Hasło jednorazowe jest wymagane"}), 400
        new_user.set_one_time_password(otp)
        new_user.password_hash = None
    else:
        new_user.set_password("User123!")

    db.session.add(new_user)
    db.session.commit()

    log_action(
        admin_user.username if admin_user else "ADMIN",
        "user_created",
        f"Created user: {new_user.username}" + (" with OTP" if use_otp else ""),
        request.remote_addr,
    )

    response_data = {
        "success": True,
        "user_id": new_user.id,
        "message": "Użytkownik utworzony",
    }
    if use_otp:
        response_data["otp"] = otp

    return jsonify(response_data), 201


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    data = request.get_json()
    user = User.query.get(user_id)
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    user.full_name = data.get("full_name", user.full_name)
    user.password_expiry_days = data.get(
        "password_expiry_days", user.password_expiry_days
    )

    use_otp = data.get("use_one_time_password", False)
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
        f"Updated user: {user.username}",
        request.remote_addr,
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
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    user.is_blocked = data.get("is_blocked", 0)
    db.session.commit()

    status = "zablokowany" if user.is_blocked else "odblokowany"
    log_action(
        admin_user.username if admin_user else "ADMIN",
        "user_blocked" if user.is_blocked else "user_unblocked",
        f"User {user.username} {status}",
        request.remote_addr,
    )

    return jsonify({"success": True, "message": f"Użytkownik {status}"})


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

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
        request.remote_addr,
    )
    return jsonify({"success": True, "message": "Użytkownik usunięty"})


@app.route("/api/users/<int:user_id>/reset-password", methods=["PUT"])
@admin_required
def reset_user_password(user_id):
    data = request.get_json()
    user = User.query.get(user_id)
    admin_user = get_admin_from_token(request.headers.get("Authorization", ""))

    if not user:
        return jsonify({"error": "Użytkownik nie istnieje"}), 404

    use_otp = data.get("use_one_time_password", False)

    if use_otp:
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
            request.remote_addr,
        )
        return jsonify(
            {"success": True, "message": "Wygenerowano hasło jednorazowe", "otp": otp}
        )
    else:
        new_password = data.get("new_password", "User123!")
        errors = validate_password(new_password)
        if errors:
            return jsonify({"error": errors}), 400
        if user.password_hash is not None:
            history_entry = PasswordHistory(
                user_id=user.id, password_hash=user.password_hash
            )
            db.session.add(history_entry)
        user.set_password(new_password)
        user.last_password_change = datetime.utcnow()
        user.must_change_password = 1
        user.disable_one_time_password()
        user.reset_with_otp = False
        db.session.commit()
        log_action(
            admin_user.username if admin_user else "ADMIN",
            "password_reset",
            f"Reset password for user: {user.username}",
            request.remote_addr,
        )
        return jsonify(
            {"success": True, "message": "Hasło użytkownika zostało zresetowane"}
        )


@app.route("/api/logs", methods=["GET"])
@admin_required
def get_logs():
    try:
        logs = Log.query.order_by(Log.created_at.desc()).all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        print(f"Error fetching logs: {str(e)}")
        return jsonify({"error": "Błąd podczas pobierania logów"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
