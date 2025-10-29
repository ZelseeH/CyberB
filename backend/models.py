from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class PasswordSettings(db.Model):
    __tablename__ = "password_settings"

    id = db.Column(db.Integer, primary_key=True)
    min_length = db.Column(db.Integer, default=8, nullable=False)
    require_capital_letter = db.Column(db.Integer, default=1, nullable=False)
    require_special_char = db.Column(db.Integer, default=1, nullable=False)
    require_digits = db.Column(db.Integer, default=1, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "min_length": self.min_length,
            "require_capital_letter": self.require_capital_letter,
            "require_special_char": self.require_special_char,
            "require_digits": self.require_digits,
        }


class SystemSettings(db.Model):
    __tablename__ = "system_settings"

    id = db.Column(db.Integer, primary_key=True)
    failed_login_limit = db.Column(db.Integer, default=5, nullable=False)
    idle_timeout_minutes = db.Column(db.Integer, default=15, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "failed_login_limit": self.failed_login_limit,
            "idle_timeout_minutes": self.idle_timeout_minutes,
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255))
    full_name = db.Column(db.String(200))
    is_admin = db.Column(db.Integer, default=0, nullable=False)
    is_blocked = db.Column(db.Integer, default=0, nullable=False)
    password_expiry_days = db.Column(db.Integer, default=90, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_password_change = db.Column(db.DateTime, default=datetime.utcnow)
    must_change_password = db.Column(db.Integer, default=1, nullable=False)
    one_time_password_enabled = db.Column(db.Boolean, default=False, nullable=False)
    one_time_password_hash = db.Column(db.String(255), nullable=True)
    reset_with_otp = db.Column(db.Boolean, default=False, nullable=False)
    failed_attempts = db.Column(db.Integer, default=0, nullable=False)
    last_failed_attempt = db.Column(db.DateTime, nullable=True)
    last_lockout = db.Column(db.DateTime, nullable=True)

    # Relacja z historią haseł
    password_history = db.relationship(
        "PasswordHistory", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def set_password(self, password):
        """Ustawia hash hasła"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Sprawdza czy hasło jest poprawne"""
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)

    def set_one_time_password(self, otp):
        """Ustawia hasło jednorazowe"""
        self.one_time_password_hash = generate_password_hash(otp)
        self.one_time_password_enabled = True
        self.reset_with_otp = True

    def verify_one_time_password(self, otp):
        """Weryfikuje hasło jednorazowe"""
        if not self.one_time_password_enabled:
            return False
        return check_password_hash(self.one_time_password_hash, otp)

    def disable_one_time_password(self):
        """Wyłącza hasło jednorazowe"""
        self.one_time_password_enabled = False
        self.one_time_password_hash = None

    def check_password_in_history(self, password):
        """Sprawdza czy hasło było już używane"""
        for history in self.password_history:
            if check_password_hash(history.password_hash, password):
                return True
        return False

    def is_password_expired(self):
        """Sprawdza czy hasło wygasło"""
        if self.password_expiry_days == 0:
            return False
        from datetime import timedelta

        expiry_date = self.last_password_change + timedelta(
            days=self.password_expiry_days
        )
        return datetime.utcnow() > expiry_date

    def is_locked_out(self):
        """Sprawdza czy konto jest tymczasowo zablokowane"""
        settings = SystemSettings.query.first()
        if self.failed_attempts >= settings.failed_login_limit and self.last_lockout:
            from datetime import timedelta
            unlock_time = self.last_lockout + timedelta(minutes=15)
            if datetime.utcnow() < unlock_time:
                return True
            else:
                # Reset po upływie czasu
                self.failed_attempts = 0
                self.last_lockout = None
                db.session.commit()
        return False

    def record_failed_attempt(self):
        """Rejestruje nieudaną próbę logowania"""
        self.failed_attempts += 1
        self.last_failed_attempt = datetime.utcnow()
        settings = SystemSettings.query.first()
        if self.failed_attempts >= settings.failed_login_limit:
            self.last_lockout = datetime.utcnow()
        db.session.commit()

    def reset_failed_attempts(self):
        """Resetuje licznik nieudanych prób"""
        self.failed_attempts = 0
        self.last_lockout = None
        db.session.commit()

    def to_dict(self, include_sensitive=False):
        data = {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "is_admin": self.is_admin,
            "is_blocked": self.is_blocked,
            "password_expiry_days": self.password_expiry_days,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_password_change": (
                self.last_password_change.isoformat()
                if self.last_password_change
                else None
            ),
            "must_change_password": self.must_change_password,
            "one_time_password_enabled": self.one_time_password_enabled,
        }
        if include_sensitive:
            data["password_expired"] = self.is_password_expired()
        return data


class PasswordHistory(db.Model):
    __tablename__ = "password_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
        }

class Log(db.Model):
    __tablename__ = 'logs'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), nullable=False, index=True)
    action_type = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'action_type': self.action_type,
            'description': self.description,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }