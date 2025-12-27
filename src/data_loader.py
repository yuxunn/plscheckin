import pandas as pd
import sqlite3
import os

def load_data(db_path):
    """
    Connects to the SQLite database and loads the noshow table.
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}")

    print(f"[DataLoader] Connecting to database at {db_path}...")
    
    conn = sqlite3.connect(db_path)
    
    query = "SELECT * FROM noshow"
    df = pd.read_sql(query, conn)
    
    conn.close()
    print(f"[DataLoader] Loaded {len(df)} rows successfully.")
    return df