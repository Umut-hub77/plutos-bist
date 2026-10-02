# ==============================================================================
# 1. Aşama: React Frontend Derlemesi (Node.js)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ==============================================================================
# 2. Aşama: Python Backend & Statik Sunucu (FastAPI + Uvicorn)
# ==============================================================================
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Gerekli C derleyicileri (numpy/scipy derlemeleri için)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python bağımlılıklarını yükle
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Backend kodlarını kopyala
COPY backend/ ./backend/

# React derleme çıktılarını kopyala
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

# Çalıştır
WORKDIR /app/backend
CMD python -m uvicorn backend:app --host 0.0.0.0 --port ${PORT:-8000}
