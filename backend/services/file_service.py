import os
from typing import IO

def convert_csv_to_excel(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    import pandas as pd
    
    base_name = os.path.splitext(filename)[0]
    out_path = os.path.join(temp_dir, f"{base_name}.xlsx")
    
    df = pd.read_csv(file_stream)
    df.to_excel(out_path, index=False, engine='openpyxl')
    return out_path

def convert_excel_to_csv(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    import pandas as pd
    import zipfile
    
    base_name = os.path.splitext(filename)[0]
    
    dfs = pd.read_excel(file_stream, sheet_name=None)
    if not dfs:
        raise ValueError("No tabular data could be found in the Excel file.")
        
    if len(dfs) == 1:
        sheet_name = next(iter(dfs.keys()))
        out_path = os.path.join(temp_dir, f"{base_name}.csv")
        dfs[sheet_name].to_csv(out_path, index=False)
        return out_path
    else:
        zip_path = os.path.join(temp_dir, f"{base_name}_csvs.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for sheet_name, df in dfs.items():
                csv_name = f"{sheet_name}.csv"
                csv_path = os.path.join(temp_dir, csv_name)
                df.to_csv(csv_path, index=False)
                zipf.write(csv_path, arcname=csv_name)
        return zip_path

def split_csv(file_stream: IO[bytes], filename: str, rows_per_file: int, temp_dir: str) -> str:
    import pandas as pd
    import zipfile
    
    base_name = os.path.splitext(filename)[0]
    zip_path = os.path.join(temp_dir, f"{base_name}_split.zip")
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for i, chunk in enumerate(pd.read_csv(file_stream, chunksize=rows_per_file)):
            part_name = f"{base_name}_part_{i+1}.csv"
            part_path = os.path.join(temp_dir, part_name)
            chunk.to_csv(part_path, index=False)
            zipf.write(part_path, arcname=part_name)
    return zip_path

def split_excel(file_stream: IO[bytes], filename: str, rows_per_file: int, temp_dir: str) -> str:
    import pandas as pd
    import zipfile
    
    base_name = os.path.splitext(filename)[0]
    zip_path = os.path.join(temp_dir, f"{base_name}_split.zip")
    
    dfs = pd.read_excel(file_stream, sheet_name=None)
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for sheet_name, df in dfs.items():
            num_rows = len(df)
            if num_rows == 0:
                part_name = f"{sheet_name}_part_1.xlsx"
                part_path = os.path.join(temp_dir, part_name)
                df.to_excel(part_path, index=False, engine='openpyxl')
                zipf.write(part_path, arcname=part_name)
                continue
                
            for i, start_row in enumerate(range(0, num_rows, rows_per_file)):
                chunk = df.iloc[start_row:start_row + rows_per_file]
                part_name = f"{sheet_name}_part_{i+1}.xlsx"
                part_path = os.path.join(temp_dir, part_name)
                chunk.to_excel(part_path, index=False, engine='openpyxl')
                zipf.write(part_path, arcname=part_name)
    return zip_path