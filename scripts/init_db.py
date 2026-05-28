import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL is not set.")
    sys.exit(1)

# Connect to the database
print("Connecting to Supabase PostgreSQL...")
engine = create_engine(DATABASE_URL)

create_tables_sql = """
-- 1. Table for Storing Scraped Komdigi Hoax News (Real-time Pipeline)
CREATE TABLE IF NOT EXISTS komdigi_hoaks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    category VARCHAR(100),
    issued_date DATE,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for User Reports & Feedback Loop
CREATE TABLE IF NOT EXISTS user_reports (
    id SERIAL PRIMARY KEY,
    text_content TEXT NOT NULL,
    url_submitted TEXT,
    ai_prediction VARCHAR(50),
    ai_confidence FLOAT,
    user_votes_as_hoax INT DEFAULT 0,
    user_votes_as_real INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table for Trending Hoaxes
CREATE TABLE IF NOT EXISTS trending_hoaxes (
    id SERIAL PRIMARY KEY,
    hoax_title TEXT NOT NULL,
    search_count INT DEFAULT 1,
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

print("Creating tables for FaktaNesia v2.0...")
with engine.connect() as conn:
    conn.execute(text(create_tables_sql))
    conn.commit()
print("Tables created successfully ✅")
