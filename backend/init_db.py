# init_db.py

from app import app, db
from models import User, PasswordSettings, PasswordHistory, Log


def init_database():
    with app.app_context():
        # Usuń stare tabele i utwórz nowe (z nowymi kolumnami)
        db.drop_all()
        db.create_all()

        # Utwórz domyślne ustawienia haseł
        default_settings = PasswordSettings(
            min_length=8,
            require_capital_letter=1,
            require_special_char=1,
            require_digits=1,
        )
        db.session.add(default_settings)
        print("✓ Utworzono domyślne ustawienia haseł")

        # Utwórz konto administratora
        admin = User(
            username="ADMIN",
            full_name="Administrator",
            is_admin=1,
            must_change_password=0,
            password_expiry_days=0,
        )
        admin.set_password("Admin123!")
        db.session.add(admin)
        print("✓ Utworzono konto administratora")
        print("Login: ADMIN")
        print("Hasło: Admin123!")

        db.session.commit()
        print("✓ Baza danych została zainicjalizowana!")
        print("\n⚠️  UWAGA: Wszystkie poprzednie dane zostały usunięte!")


if __name__ == "__main__":
    print("=== Inicjalizacja bazy danych ===\n")
    confirmation = input("To usunie całą bazę danych i utworzy ją od nowa. Kontynuować? (tak/nie): ")
    
    if confirmation.lower() in ['tak', 't', 'yes', 'y']:
        init_database()
    else:
        print("Anulowano.")