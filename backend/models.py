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


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200))
    is_admin = db.Column(db.Integer, default=0, nullable=False)
    is_blocked = db.Column(db.Integer, default=0, nullable=False)
    password_expiry_days = db.Column(db.Integer, default=90, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_password_change = db.Column(db.DateTime, default=datetime.utcnow)
    must_change_password = db.Column(db.Integer, default=1, nullable=False)

    # Relacja z historią haseł
    password_history = db.relationship(
        "PasswordHistory", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def set_password(self, password):
        """Ustawia hash hasła"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Sprawdza czy hasło jest poprawne"""
        return check_password_hash(self.password_hash, password)

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
