$env:REDISCLOUD_URL="redis://localhost:6379" 


uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload --workers 1 --log-level info