from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # <-- add this import
import pandas as pd
import shutil
import os
from classify import classify_log
from collections import Counter

app = FastAPI()

# Ensure resources directory exists
os.makedirs("resources", exist_ok=True)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development;
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_PATH = "resources/output.csv"

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    temp_path = f"resources/temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Read CSV
    try:
        df = pd.read_csv(temp_path)
    except Exception as e:
        os.remove(temp_path)
        return JSONResponse({"error": f"Failed to read CSV: {str(e)}"}, status_code=400)

    # --- Validation: must have exactly two columns: source, log_message ---
    expected_cols = ["source", "log_message"]
    if list(df.columns) != expected_cols:
        os.remove(temp_path)
        return JSONResponse({"error": "Upload file in correct format: CSV must have columns 'source' and 'log_message' (in this order)."}, status_code=400)

    # Remove rows where either source or log_message is missing or empty
    df = df.dropna(subset=expected_cols)
    df = df[(df["source"].astype(str).str.strip() != "") & (df["log_message"].astype(str).str.strip() != "")]
    if df.empty:
        os.remove(temp_path)
        return JSONResponse({"error": "Upload file in correct format: No valid rows found (check for empty or missing values)."}, status_code=400)

    # Predict labels
    df["predicted_label"] = df.apply(lambda row: classify_log(row["source"], row["log_message"]), axis=1)

    # Save output
    df.to_csv(OUTPUT_PATH, index=False)

    # Replace NaN with None for JSON serialization
    df = df.where(pd.notnull(df), None)

    # Prepare results for display
    results = df[["source", "log_message", "predicted_label"]].to_dict(orient="records")
    # Statistics and summary
    stats = Counter(df["predicted_label"])
    stats_table = [{"log_class": k, "count": v} for k, v in stats.items()]
    summary = f"Total logs: {len(df)}. Classes: {', '.join(f'{k} ({v})' for k, v in stats.items())}."
    # Output preview
    output_preview = df.head(5)[["source", "log_message", "predicted_label"]].to_dict(orient="records")

    # --- Compute statistics ---
    total_logs = len(df)
    label_counts = df["predicted_label"].value_counts().to_dict()
    chart_labels = list(label_counts.keys())
    chart_values = list(label_counts.values())

    # Remove temp file
    os.remove(temp_path)

    return JSONResponse({
        "results": results,
        "output_preview": output_preview,
        "stats_table": stats_table,
        "summary": summary
    })

@app.post("/preview")
async def preview(file: UploadFile = File(...)):
    temp_path = f"resources/temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        df = pd.read_csv(temp_path)
        # --- Validation for preview as well ---
        expected_cols = ["source", "log_message"]
        if list(df.columns) != expected_cols:
            os.remove(temp_path)
            return JSONResponse({"preview": [], "error": "Upload file in correct format: CSV must have columns 'source' and 'log_message' (in this order)."}, status_code=400)
        df = df.dropna(subset=expected_cols)
        df = df[(df["source"].astype(str).str.strip() != "") & (df["log_message"].astype(str).str.strip() != "")]
        preview_rows = df.head(5).to_dict(orient="records")
    except Exception as e:
        os.remove(temp_path)
        return JSONResponse({"preview": [], "error": str(e)}, status_code=400)
    os.remove(temp_path)
    return JSONResponse({"preview": preview_rows})

@app.get("/download")
async def download():
    return FileResponse(OUTPUT_PATH, filename="output.csv", media_type="text/csv")

# Serve static files (frontend build) at root
app.mount("/", StaticFiles(directory="static", html=True), name="static")