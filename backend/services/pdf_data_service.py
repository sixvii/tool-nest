import os
import tempfile
import gc
import shutil
from typing import IO

def extract_text_from_pdf(file_stream: IO[bytes]) -> str:
    import fitz
    
    txt_fd, txt_path = tempfile.mkstemp(suffix=".txt")
    os.close(txt_fd)
    
    try:
        doc = fitz.open(stream=file_stream.read(), filetype="pdf")
        text_content = []
        for page in doc:
            text_content.append(page.get_text())
            
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("\n\n".join(text_content))
            
        doc.close()
        return txt_path
    finally:
        gc.collect()

def extract_csv_from_pdf(file_stream: IO[bytes]) -> str:
    import tabula
    import zipfile
    
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    out_dir = tempfile.mkdtemp()
    os.close(pdf_fd)
    
    try:
        with open(pdf_path, "wb") as f:
            f.write(file_stream.read())
            
        dfs = tabula.read_pdf(pdf_path, pages="all", multiple_tables=True)
        if not dfs:
            raise ValueError("No tabular data could be found in the provided PDF.")
            
        if len(dfs) == 1:
            csv_fd, csv_path = tempfile.mkstemp(suffix=".csv")
            os.close(csv_fd)
            dfs[0].to_csv(csv_path, index=False)
            return csv_path
        else:
            zip_fd, zip_path = tempfile.mkstemp(suffix=".zip")
            os.close(zip_fd)
            
            with zipfile.ZipFile(zip_path, "w") as zipf:
                for i, df in enumerate(dfs):
                    csv_name = f"table_{i+1}.csv"
                    csv_file_path = os.path.join(out_dir, csv_name)
                    df.to_csv(csv_file_path, index=False)
                    zipf.write(csv_file_path, arcname=csv_name)
                    
            return zip_path
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if os.path.exists(out_dir):
            shutil.rmtree(out_dir)
        gc.collect()

def extract_excel_from_pdf(file_stream: IO[bytes]) -> str:
    import tabula
    import pandas as pd
    
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    xlsx_fd, xlsx_path = tempfile.mkstemp(suffix=".xlsx")
    os.close(pdf_fd)
    os.close(xlsx_fd)
    
    try:
        with open(pdf_path, "wb") as f:
            f.write(file_stream.read())
            
        dfs = tabula.read_pdf(pdf_path, pages="all", multiple_tables=True)
        if not dfs:
            raise ValueError("No tabular data could be found in the provided PDF.")
            
        with pd.ExcelWriter(xlsx_path, engine='openpyxl') as writer:
            for i, df in enumerate(dfs):
                sheet_name = f"Table_{i+1}"
                df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
                
        return xlsx_path
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        gc.collect()