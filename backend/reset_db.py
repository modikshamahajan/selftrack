#!/usr/bin/env python3
"""
SelfTrack Clean Database Reset Script
Clears all user-generated records (users, habits, logs, health, journals, social, chat)
while safely keeping the admin account and system badges intact for fresh Expo onboarding.
"""
import sqlite3
import os
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_PATH = os.path.join(os.path.dirname(__file__), "selftrack.db")

def reset_database():
    print(f"Connecting to database at: {DB_PATH}")
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Disable foreign keys temporarily for clean truncate
    cur.execute("PRAGMA foreign_keys = OFF;")

    tables_to_clear = [
        "habit_logs",
        "habits",
        "health_metrics",
        "food_logs",
        "journal_entries",
        "user_badges",
        "social_comments",
        "social_posts",
        "notifications",
        "ai_chat_messages",
        "user_settings",
        "app_downloads",
        "users",
    ]

    for table in tables_to_clear:
        try:
            cur.execute(f"DELETE FROM {table};")
            print(f"  [✓] Cleared table: {table}")
        except sqlite3.OperationalError as e:
            print(f"  [-] Table {table} not found or skipped: {e}")

    # Re-enable foreign keys
    cur.execute("PRAGMA foreign_keys = ON;")

    # Ensure admin user exists
    cur.execute("SELECT id FROM admins WHERE email = 'admin@selftrack.com';")
    admin = cur.fetchone()
    if not admin:
        import uuid
        admin_id = str(uuid.uuid4())
        hashed = pwd_context.hash("admin123")
        cur.execute(
            "INSERT INTO admins (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, datetime('now'));",
            (admin_id, "admin@selftrack.com", hashed, "superadmin")
        )
        print("  [✓] Created fresh default admin account: admin@selftrack.com / admin123")
    else:
        print("  [✓] Default admin account preserved.")

    # Ensure standard badges exist
    standard_badges = [
        ("early_bird", "Early Bird", "Completed habits before 9 AM", "sunrise", 50),
        ("consistent", "Consistent", "Maintained a 7-day habit streak", "flame", 100),
        ("focused", "Focused", "Completed 5 deep focus sessions", "target", 150),
        ("achiever", "Achiever", "Logged all daily health goals", "trophy", 200),
    ]
    for slug, title, desc, img, xp in standard_badges:
        cur.execute("SELECT id FROM badges WHERE slug = ?;", (slug,))
        if not cur.fetchone():
            import uuid
            cur.execute(
                "INSERT INTO badges (id, slug, title, description, image_name, xp_reward) VALUES (?, ?, ?, ?, ?, ?);",
                (str(uuid.uuid4()), slug, title, desc, img, xp)
            )
    print("  [✓] System badges verified.")

    con.commit()
    cur.execute("VACUUM;")
    con.close()
    print("\nDatabase has been successfully reset! Ready for fresh Expo data entry.")

if __name__ == "__main__":
    reset_database()
