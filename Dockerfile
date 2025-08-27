# ---- Python base for backend dependencies ----
FROM python:3.11-slim AS backend

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Node.js build stage for frontend ----
FROM node:20-slim AS frontend

WORKDIR /frontend
COPY log-classfication-frontend/package.json log-classfication-frontend/package-lock.json* ./log-classfication-frontend/
WORKDIR /frontend/log-classfication-frontend
RUN npm install
COPY log-classfication-frontend ./  
RUN npm run build

# ---- Final minimal image ----
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g., curl)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy only installed Python packages and backend code
COPY --from=backend /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=backend /usr/local/bin /usr/local/bin
COPY --from=backend /usr/local/include /usr/local/include

# Copy backend source code (excluding frontend, node_modules, etc.)
COPY server.py .
COPY classify.py .
COPY processor_regex.py .
COPY processor_bert.py .
COPY processor_llm.py .
COPY requirements.txt .
COPY resources ./resources
COPY models ./models
COPY .env .

# Copy frontend production build only
COPY --from=frontend /frontend/log-classfication-frontend/dist ./static

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
