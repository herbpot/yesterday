# Weather Diff MVP

## 소개

- 현재 ↔ 어제 동시각 기온, 최고·최저 비교 + 푸시 알림
- FastAPI 백엔드, React 웹(PWA), Expo 모바일 앱

## 실행 방법

1. `.env` 파일을 루트에 복사/작성 후 값 입력
2. Redis, Firebase 세팅 필요
3. 아래 명령어로 실행

```bash
# 백엔드
docker build -t tempdiff-api ./backend
docker run --env-file .env -p 8080:8080 tempdiff-api

# 웹
cd web
npm i
npm run dev

# 모바일
cd ../mobile
npm i
npx expo start
```

## 환경 변수

- METEOSTAT_KEY: Meteostat API 키
- FIREBASE_CRED: Firebase 서비스 계정 JSON 경로
- REDIS_HOST/PORT: Redis 정보
- VITE_API_BASE, EXPO_PUBLIC_API_BASE: API 엔드포인트

---

## 추가 안내

- Cloud Run, Vercel, Expo EAS 배포도 간단히 지원
- 오류/기능 요청은 언제든 말씀해 주세요! 