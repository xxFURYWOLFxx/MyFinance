"""Initialize the database with all tables."""
import sys
sys.path.insert(0, '.')

from app.db.base import Base
from app.db.session import engine
from app.models import *  # Import all models to register them

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()
