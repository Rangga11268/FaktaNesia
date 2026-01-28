import pandas as pd
import os

files = [
    'data/Cleaned_Antaranews_v1.csv',
    'data/Cleaned_Detik_v2.csv',
    'data/Cleaned_Kompas_v2.csv',
    'data/Cleaned_TurnBackHoax_v3.csv',
    'data/komdigi_hoaks.csv'
]

with open('schema_info.txt', 'w') as out:
    for f in files:
        out.write(f"\n--- {f} ---\n")
        if os.path.exists(f):
            try:
                df = pd.read_csv(f, nrows=2)
                out.write(f"Columns: {df.columns.tolist()}\n")
                # Write first row keys/values to see content example
                row = df.iloc[0].to_dict()
                out.write(f"Sample: {row}\n")
            except Exception as e:
                out.write(f"Error reading {f}: {e}\n")
        else:
            out.write("File not found.\n")
