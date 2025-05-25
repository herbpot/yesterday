$env:REDISCLOUD_URL="redis://localhost:6379" 
$env:FIREBASE_CRED="./yesterday-fb2b6-firebase-adminsdk-fbsvc-60ea20dd7d.json"

uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload --workers 1 --log-level info