import requests
import pandas as pd
import time
import os

def scrape_komdigi_hoaks(max_pages=5, per_page=100, output_file="data/komdigi_hoaks_tambahan.csv"):
    base_url = "https://web.komdigi.go.id/api/v1/contents/category/berita-hoaks"
    
    headers = {
        "referer": "https://www.komdigi.go.id/",
        "origin": "https://www.komdigi.go.id",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "accept": "application/json"
    }

    all_data = []

    print(f"Scraping up to {max_pages} pages (per_page={per_page})...")
    
    for page in range(1, max_pages + 1):
        url = f"{base_url}?perPage={per_page}&page={page}"
        print(f"Fetching page {page}...")
        
        try:
            res = requests.get(url, headers=headers)
            if res.status_code != 200:
                print(f"Failed to fetch page {page}. Status: {res.status_code}")
                break
                
            data = res.json()
            items = data.get("response", {}).get("data", [])
            
            if not items:
                print("No more items found. Stopping.")
                break
                
            for item in items:
                all_data.append({
                    "id": item.get("id"),
                    "url": f"https://www.komdigi.go.id/berita/berita-hoaks/detail/{item.get('slug')}",
                    "title": item.get("title"),
                    "slug": item.get("slug"),
                    "published_at": item.get("published_at"),
                    "view_count": item.get("view_count"),
                    "excerpt": item.get("excerpt"),
                    "body_html": item.get("body_html"),
                    "body_text": item.get("body_text"),
                    "main_image_url": item.get("main_image_url"),
                    "category": item.get("category", {}).get("title") if isinstance(item.get("category"), dict) else item.get("category"),
                    "tags": ", ".join([str(t.get("name", "")) for t in item.get("tags", [])]) if isinstance(item.get("tags"), list) else str(item.get("tags", "")),
                    "topics": item.get("topic", {}).get("title") if isinstance(item.get("topic"), dict) else item.get("topic")
                })
            
            print(f"    Added {len(items)} items. Total so far: {len(all_data)}")
            
            # Cek jika ini adalah halaman terakhir
            last_page = data.get("response", {}).get("last_page", page)
            if page >= last_page:
                print("Reached last page.")
                break
                
            time.sleep(0.5) # delay untuk mencegah rate limit
            
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break

    if all_data:
        os.makedirs("data", exist_ok=True)
        df = pd.DataFrame(all_data)
        df.to_csv(output_file, index=False)
        print(f"\nSukses! Menyimpan {len(df)} baris data di {output_file}")
    else:
        print("\nTidak ada data yang berhasil diambil.")

if __name__ == "__main__":
    # scrape semua page maks 200 (Total data sekitar 16.000, 100 per halaman berarti butuh ~164 halaman)
    scrape_komdigi_hoaks(max_pages=200, per_page=100, output_file="data/komdigi_hoaks_tambahan.csv")
