FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY ./requirements.txt .
COPY ./yesterday-fb2b6-firebase-adminsdk-fbsvc-60ea20dd7d.json .
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

ENV REDISCLOUD_URL="redis://host.docker.internal:6379" \
    FIREBASE_CRED="./yesterday-fb2b6-firebase-adminsdk-fbsvc-60ea20dd7d.json"

COPY ./app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"] 