import sqlite3
import os
from src.backend.database import engine, Base
from src.backend import models  # Ensure all models are registered

db_path = "sql_app.db"

def fix_db():
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("PRAGMA table_info(meetings)")
        columns = [row[1] for row in cursor.fetchall()]
        print("Existing meetings columns:", columns)
        
        if "status" not in columns:
            print("Adding missing 'status' column...")
            cursor.execute("ALTER TABLE meetings ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'SCHEDULED'")
        if "started_at" not in columns:
            print("Adding missing 'started_at' column...")
            cursor.execute("ALTER TABLE meetings ADD COLUMN started_at DATETIME")
        if "ended_at" not in columns:
            print("Adding missing 'ended_at' column...")
            cursor.execute("ALTER TABLE meetings ADD COLUMN ended_at DATETIME")
        if "recording_url" not in columns:
            print("Adding missing 'recording_url' column...")
            cursor.execute("ALTER TABLE meetings ADD COLUMN recording_url VARCHAR")
            
        conn.commit()
        conn.close()
        print("SQLite schema migration complete.")

    # Run create_all for any missing tables
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all complete.")

if __name__ == "__main__":
    fix_db()
