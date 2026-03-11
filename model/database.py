import sqlite3
from pathlib import Path

# Always use this to get the correct DB path, no matter where you run your script from
def get_db_path():
    # Ensures the database folder exists and returns the path to the database
    db_folder = Path("database")
    db_folder.mkdir(exist_ok=True)
    db_path = db_folder / "cubestats.db"
    return db_path

def get_connection():
    """Returns a new connection to the database."""
    return sqlite3.connect(get_db_path())

def create_tables():
    """Creates the tables in the database if they don't exist."""
    conn = get_connection()
    cur = conn.cursor()
    # Simple solve table, expand as needed
    cur.execute("""
    CREATE TABLE IF NOT EXISTS solves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session TEXT NOT NULL,
        time TEXT NOT NULL,
        date TEXT NOT NULL,
        scramble TEXT,
        penalty TEXT
    );
    """)
    # Add more tables here if needed
    conn.commit()
    conn.close()

def add_solve(session, time, date, scramble, penalty=None):
    """Inserts a solve into the database."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO solves (session, time, date, scramble, penalty)
    VALUES (?, ?, ?, ?, ?)
    """, (session, time, date, scramble, penalty))
    conn.commit()
    conn.close()

def get_solves(session=None):
    """Gets all solves, or only those for a session if specified."""
    conn = get_connection()
    cur = conn.cursor()
    if session:
        cur.execute("""
        SELECT * FROM solves WHERE session=?
        ORDER BY date ASC
        """, (session,))
    else:
        cur.execute("SELECT * FROM solves ORDER BY date ASC")
    rows = cur.fetchall()
    conn.close()
    return rows

def delete_solve(solve_id):
    """Deletes a solve by ID."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM solves WHERE id=?", (solve_id,))
    conn.commit()
    conn.close()

# Optionally, auto-create tables at module load (good for dev, for prod do in main.py)
if __name__ == "__main__":
    create_tables()
