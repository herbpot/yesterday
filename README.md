# 살짝더 (Yesterday) - 어제와 오늘 날씨 비교 앱

> 어제 같은 시간의 기온과 오늘을 비교하여 체감 기온 변화를 쉽게 파악할 수 있는 날씨 앱

## 프로젝트 개요

**살짝더(Yesterday)**는 현재 기온을 어제 같은 시간의 기온과 비교하여, 실생활에서 유용한 날씨 정보를 제공하는 모바일 애플리케이션입니다. 단순히 현재 기온을 보여주는 것이 아니라, 어제와의 온도 차이를 한눈에 파악할 수 있어 옷차림을 결정하는 데 도움을 줍니다.

### 주요 특징

- **시간별 온도 비교**: 현재 시각과 어제 같은 시각의 온도 비교
- **일일 최고/최저 기온 비교**: 오늘과 어제의 최고/최저 기온 차이 확인
- **AI 기반 옷차림 추천**: 체감 온도와 온도 변화를 고려한 의류 추천
- **푸시 알림**: 매일 원하는 시간에 날씨 변화 알림
- **Android 위젯**: 홈 화면에서 바로 날씨 확인
- **시간별 차트**: 오늘과 어제의 시간별 온도 변화 그래프

## 프로젝트 구조

이 레포지토리는 **브랜치별로 코드가 분리**되어 있습니다:

### 주요 브랜치

- **`main`**: 프로젝트 메인 브랜치
- **`backend`**: FastAPI 기반 백엔드 API 서버
- **`mobile-develop-ai`**: React Native/Expo 모바일 앱 (AI 기능 포함)
- **`mobile-develop`**: React Native/Expo 모바일 앱 (안정 버전)
- **`mobile-1.1`**: 모바일 앱 릴리즈 버전
- **`backend-develop`**: 백엔드 개발 브랜치

---

## 백엔드 (Backend Branch)

### 기술 스택

- **언어**: Python 3.11+
- **프레임워크**: FastAPI 0.110.2
- **웹 서버**: Uvicorn 0.29.0
- **데이터베이스**: Redis 5.0.4 (캐싱 및 토큰 관리)
- **날씨 API**: Meteostat 1.6.8
- **푸시 알림**: Firebase Cloud Messaging
- **배포**: Docker + Google Cloud Run

### 주요 API 엔드포인트

#### 1. GET `/compare` - 같은 시간 온도 비교
```
Query Parameters:
  - lat: 위도 (float)
  - lon: 경도 (float)

Response:
{
  "now": 15.2,        // 현재 온도 (°C)
  "yesterday": 12.1,  // 어제 같은 시간 온도
  "delta": 3.1        // 온도 차이
}
```

#### 2. GET `/extremes` - 일일 최고/최저 온도 비교
```
Query Parameters:
  - lat: 위도 (float)
  - lon: 경도 (float)

Response:
{
  "today_max": 18.5,
  "today_min": 8.2,
  "yest_max": 16.1,
  "yest_min": 7.5,
  "delta_max": 2.4,
  "delta_min": 0.7
}
```

#### 3. POST `/register_token` - 푸시 알림 등록
```
Request Body:
{
  "uid": "user_id",
  "token": "fcm_token"
}
```

#### 4. POST `/notify_daily` - 일일 알림 발송
```
Response:
{"sent": 42}  // 발송 성공 건수
```

### 백엔드 설치 및 실행

#### 사전 요구사항
- Python 3.11 이상
- Redis 서버
- Firebase 프로젝트 (서비스 계정 인증 파일)
- Meteostat API 키

#### 설치 방법

```bash
# 레포지토리 클론
git clone https://github.com/herbpot/yesterday.git
cd yesterday

# 백엔드 브랜치로 전환
git checkout backend

# Python 가상환경 생성
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r backend/requirements.txt

# 환경 변수 설정 (.env 파일 생성)
# REDIS_HOST=<redis_host>
# REDIS_PORT=<redis_port>
# FIREBASE_CRED=<firebase_json_path>
# METEOSTAT_KEY=<api_key>

# 서버 실행
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Docker로 실행

```bash
# Docker 이미지 빌드
docker build -t yesterday-api ./backend

# 컨테이너 실행
docker run --env-file .env -p 8080:8080 yesterday-api
```

#### API 문서
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 모바일 앱 (Mobile-Develop-AI Branch)

### 기술 스택

- **프레임워크**: React Native 0.79.4 (Expo 53.0.9)
- **언어**: TypeScript 5.8.3
- **내비게이션**: React Navigation 7.1.9
- **차트**: React Native Gifted Charts 1.4.61
- **스타일링**: NativeWind 2.0.11 (Tailwind for React Native)
- **로컬 저장소**: AsyncStorage, Expo Secure Store
- **푸시 알림**: Firebase Cloud Messaging
- **위치**: React Native Geolocation Service
- **광고**: Google AdMob
- **위젯**: React Native Android Widget

### 주요 기능

#### 1. 메인 화면
- 현재 위치 기반 자동 날씨 조회
- 현재 온도 vs 어제 같은 시간 온도 비교
- 온도 차이 뱃지 (상승/하강 색상 구분)
- AI 기반 옷차림 추천
- 습도, UV 지수, 체감 온도 정보
- 위로 스와이프 → 시간별 차트로 이동

#### 2. 시간별 차트 화면
- 오늘/어제 시간별 온도 이중 라인 차트
- 터치로 특정 시간 선택 및 상세 정보 표시
- 영역 채우기 시각화
- 아래로 스와이프 → 메인 화면으로 복귀

#### 3. 알림 설정
- 매일 푸시 알림 on/off
- 알림 수신 시간 커스터마이징
- 설정 자동 저장

#### 4. Android 홈 화면 위젯
- 현재 온도 실시간 표시
- 어제 대비 온도 차이 표시
- 1시간마다 자동 업데이트
- 위젯 클릭 시 앱 실행

### 지원 플랫폼

- **Android**: 완전 지원 (위젯 포함)
- **iOS**: 지원 (위젯 제외)
- **Web**: 개발/테스트용 지원

### 모바일 앱 설치 및 실행

#### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn
- Expo CLI
- Android SDK (Android 빌드 시)
- JDK 11 이상

#### 설치 방법

```bash
# 레포지토리 클론 (아직 안 했다면)
git clone https://github.com/herbpot/yesterday.git
cd yesterday

# 모바일 브랜치로 전환
git checkout mobile-develop-ai

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# EXPO_PUBLIC_API_BASE=<backend_api_url>
# GOOGLE_ADMOB_APP_ID=<admob_app_id>
# EXPO_PUBLIC_GOOGLE_ADMOB_BANNER_ID=<admob_banner_id>

# Firebase 설정
# google-services.json을 mobile/ 루트에 배치

# 개발 서버 시작
npx expo start

# Android 기기/에뮬레이터에서 실행
npx expo run:android

# iOS 시뮬레이터에서 실행
npx expo run:ios
```

#### 프로덕션 빌드

```bash
# EAS CLI 사용
eas build --platform android --profile production

# 로컬 Android APK 빌드
eas build --platform android --profile local-android
```

---

## 개발 가이드

### 백엔드 개발

1. **새 엔드포인트 추가**: `backend/app/main.py`에 라우트 정의
2. **날씨 로직 수정**: `backend/app/weather.py` 편집
3. **푸시 알림 로직**: `backend/app/push.py` 편집
4. **의존성 추가**: `requirements.txt` 업데이트

### 모바일 앱 개발

1. **새 화면 추가**: `app/screens/` 디렉토리에 파일 생성
2. **컴포넌트 추가**: `components/` 디렉토리에 파일 생성
3. **API 호출 수정**: `services/weather_.ts` 편집
4. **스타일 변경**: Tailwind 클래스 사용 또는 `constants/colors.ts` 수정
5. **의존성 추가**: `package.json` 업데이트 후 `npm install`

### 테스트

#### 백엔드 API 테스트
```bash
# 온도 비교 엔드포인트
curl "http://localhost:8000/compare?lat=37.5665&lon=126.978"

# 최고/최저 온도
curl "http://localhost:8000/extremes?lat=37.5665&lon=126.978"
```

#### 모바일 앱 테스트
```bash
# Android 에뮬레이터에서 실행
npx expo run:android

# 핫 리로드 활성화
npx expo start --clear
```

---

## 환경 변수 설정

### 백엔드 (.env)
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase
FIREBASE_CRED=/path/to/firebase-adminsdk.json

# Meteostat
METEOSTAT_KEY=your_api_key
```

### 모바일 (.env)
```env
# API Endpoints
EXPO_PUBLIC_API_BASE=https://your-api-url.com/
EXPO_PUBLIC_API_BASE_DEV=http://10.0.2.2:8080/

# AdMob
GOOGLE_ADMOB_APP_ID=ca-app-pub-xxxxx
EXPO_PUBLIC_GOOGLE_ADMOB_BANNER_ID=ca-app-pub-xxxxx/xxxxx
```

---

## 배포

### 백엔드 배포 (Google Cloud Run)

```bash
# Docker 이미지 빌드 및 푸시
gcloud builds submit --tag gcr.io/PROJECT_ID/yesterday-api ./backend

# Cloud Run에 배포
gcloud run deploy yesterday-api \
  --image gcr.io/PROJECT_ID/yesterday-api \
  --platform managed \
  --region asia-northeast3 \
  --set-env-vars REDIS_HOST=<host>,REDIS_PORT=6379
```

### 모바일 앱 배포

```bash
# EAS Build로 프로덕션 APK/AAB 생성
eas build --platform android --profile production

# Google Play Console에 업로드
```

---

## 프로젝트 구조 상세

### 백엔드 디렉토리 구조
```
backend/
├── app/
│   ├── main.py          # FastAPI 앱 & 라우트
│   ├── weather.py       # 날씨 비교 로직
│   ├── push.py          # Firebase 푸시 알림
│   └── logger.py        # 로깅 설정
├── Dockerfile           # Docker 설정
├── requirements.txt     # Python 의존성
└── pyproject.toml       # 프로젝트 메타데이터
```

### 모바일 디렉토리 구조
```
mobile/
├── app/
│   ├── screens/         # 앱 화면 컴포넌트
│   ├── widget/          # Android 위젯
│   └── widgetHandler/   # 위젯 핸들러
├── components/          # 재사용 가능한 UI 컴포넌트
├── services/            # API 호출 & 비즈니스 로직
├── constants/           # 색상, 폰트 등 상수
├── assets/              # 이미지, 폰트 리소스
├── android/             # Android 네이티브 코드
├── app.json             # Expo 앱 설정
└── eas.json             # EAS 빌드 프로필
```

---

## 기여하기

이슈 제보 및 풀 리퀘스트를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 연락처

프로젝트 관련 문의: [GitHub Issues](https://github.com/herbpot/yesterday/issues)

---

## 감사의 말

- [Meteostat](https://meteostat.net/) - 무료 날씨 데이터 API
- [Firebase](https://firebase.google.com/) - 푸시 알림 서비스
- [Expo](https://expo.dev/) - React Native 개발 플랫폼
- [FastAPI](https://fastapi.tiangolo.com/) - 현대적인 Python 웹 프레임워크
