# init_db.py

from app import app, db
from models import (
    User,
    PasswordSettings,
    PasswordHistory,
    Log,
    CaptchaQuestion,
    SystemSettings,
)


def init_database():
    with app.app_context():
        # Utwórz TYLKO nowe tabele (nie usuwa starych)
        db.create_all()
        print("✓ Tabele zostały stworzone/zaktualizowane")

        # Dodaj pytania CAPTCHA (jeśli nie istnieją)
        if CaptchaQuestion.query.first() is None:
            captcha_questions = [
                CaptchaQuestion(
                    question="Co jest stolicą Wielkiej Brytanii?", answer="londyn"
                ),
                CaptchaQuestion(question="Co jest stolicą Polski?", answer="warszawa"),
                CaptchaQuestion(question="Co jest stolicą Francji?", answer="paryż"),
                CaptchaQuestion(question="Ile jest 2 + 2?", answer="4"),
                CaptchaQuestion(question="Jaki kolor ma niebo?", answer="niebieski"),
                CaptchaQuestion(question="Co jest stolicą Niemiec?", answer="berlin"),
                CaptchaQuestion(question="Ile nóg ma pies?", answer="4"),
                CaptchaQuestion(question="Co jest stolicą Włoch?", answer="rzym"),
            ]
            for question in captcha_questions:
                db.session.add(question)
            db.session.commit()
            print("✓ Dodano pytania CAPTCHA (8 pytań)")
        else:
            print("✓ Pytania CAPTCHA już istnieją")

        print("✓ Baza danych została zaktualizowana!")
        print("⚠️  Istniejące dane zostały zachowane!")


if __name__ == "__main__":
    print("=== Inicjalizacja bazy danych ===\n")
    confirmation = input("Dodać nowe tabele i pytania CAPTCHA? (tak/nie): ")

    if confirmation.lower() in ["tak", "t", "yes", "y"]:
        init_database()
    else:
        print("Anulowano.")
