from app import app, db
from models import User, PasswordSettings, PasswordHistory


def init_database():
    with app.app_context():
        # Usuń wszystkie tabele i utwórz na nowo
        db.drop_all()
        db.create_all()

        # Dodaj domyślne ustawienia hasła
        default_settings = PasswordSettings(
            min_length=8,
            require_capital_letter=1,
            require_special_char=1,
            require_digits=1,
        )
        db.session.add(default_settings)

        # Dodaj domyślnego administratora (login: ADMIN, hasło: Admin123!)
        admin = User(
            username="ADMIN",
            full_name="Administrator",
            is_admin=1,
            must_change_password=0,
            password_expiry_days=0,  # Hasło admina nie wygasa
        )
        admin.set_password("Admin123!")
        db.session.add(admin)

        db.session.commit()
        print("✓ Baza danych została zainicjalizowana!")
        print("✓ Domyślne konto administratora:")
        print("  Login: ADMIN")
        print("  Hasło: Admin123!")


if __name__ == "__main__":
    init_database()
