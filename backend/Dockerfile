FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app app
COPY data/trips.json seed/trips.json
ENV DATA_DIR=/data SEED_PATH=/app/seed/trips.json APP_TIMEZONE=Asia/Almaty
EXPOSE 8000
CMD ["uvicorn", "app.main:app_from_env", "--factory", "--host", "0.0.0.0", "--port", "8000"]
