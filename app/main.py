from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from app.tasks import send_push_notification, send_push
import os
from dotenv import load_dotenv
from pymongo import MongoClient



app = FastAPI()

mongo_url = os.getenv("MONGO_URL")

mongo_client = MongoClient(mongo_url)
db = mongo_client.yesterday
if os.getenv("DEV", "false").lower() == "true":
    db = mongo_client.yesterday_dev
notifications_sent = db.notifications_sent

@app.get("/status")
def read_status():
    return {"status": "running"}

@app.get("/privacy-policy", response_class=HTMLResponse)
async def read_privacy():
    with open("app/PrivacyPolicy.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/history", response_class=HTMLResponse)
async def read_history():
    history_data = notifications_sent.find().sort("createdAt", -1).limit(100)
    html_content = "<html><head><title>History</title></head><body><h1>Notification History</h1><table border='1'><tr><th>Timestamp (UTC)</th><th>User ID</th></tr>"
    for item in history_data:
        html_content += f"<tr><td>{item.get('createdAt')}</td><td>{item.get('uid')}</td></tr>"
    html_content += "</table></body></html>"
    return html_content

@app.post("/trigger-task")
async def trigger_task():
    send_push_notification.delay()
    return {"message": "Task triggered"}

@app.post("/send-to-user")
async def send_notification_to_user(token: str, title: str, body: str):
    messages = [{"token": token, "title": title, "body": body}]
    success_count = send_push(messages)
    return {"message": f"Sent {success_count} notifications successfully."}

import uvicorn
import subprocess
import time

if __name__ == "__main__":
    # Start Celery Beat
    beat_process = subprocess.Popen(
        ["celery", "-A", "app.tasks", "beat", "--loglevel=info"],

    )
    print("Celery Beat started.")
    time.sleep(5)  # Give beat some time to start

    # Start Celery Worker
    worker_process = subprocess.Popen(
        ["celery", "-A", "app.tasks", "worker", "--loglevel=info"],

    )
    print("Celery Worker started.")

    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    finally:
        print("Terminating Celery Beat and Worker processes...")
        beat_process.terminate()
        worker_process.terminate()
        beat_process.wait()
        worker_process.wait()
        print("Celery Beat and Worker processes terminated.")

