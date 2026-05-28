import os
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CSV_PATH = os.getenv("KOMDIGI_CSV_PATH", "data/komdigi_hoaks_tambahan.csv")

def upsert_komdigi(csv_path=CSV_PATH, database_url=DATABASE_URL):
    if not database_url:
        print("DATABASE_URL not set. Aborting upsert.")
        return
    if not os.path.exists(csv_path):
        print(f"CSV not found at {csv_path}. Please run scrape first.")
        return

    df = pd.read_csv(csv_path)
    engine = create_engine(database_url)

    inserted = 0
    with engine.begin() as conn:
        for _, row in df.iterrows():
            try:
                conn.execute(
                    text(
                        """
                        INSERT INTO komdigi_hoaks (title, url, category, issued_date, scraped_at)
                        VALUES (:title, :url, :category, :issued_date, CURRENT_TIMESTAMP)
                        ON CONFLICT (url) DO NOTHING
                        """
                    ),
                    {
                        "title": str(row.get("title") or "")[:1000],
                        "url": row.get("url"),
                        "category": row.get("category"),
                        "issued_date": row.get("published_at")
                    },
                )
                inserted += 1
            except Exception as e:
                print(f"Failed to insert row: {e}")

    print(f"Upsert complete. Processed {len(df)} rows, attempted {inserted} inserts.")

if __name__ == '__main__':
    upsert_komdigi()
