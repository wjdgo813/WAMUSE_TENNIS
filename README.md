# 🎾 WAMUSE TENNIS - Global Ranking Server

온라인 테니스 게임 플랫폼입니다. 여러 디바이스에서 플레이한 점수를 중앙 서버에 저장하고 글로벌 랭킹을 확인할 수 있습니다.

## 🚀 시작하기

### 요구사항
- Node.js 14+
- npm

### 설치 및 실행

```bash
# 1. 패키지 설치 (처음 한 번만)
npm install

# 2. 서버 시작
npm start

# 3. 브라우저에서 접속
# http://localhost:3000 (로컬)
# http://<탄력IP> (외부)
```

## 📊 API 문서

### 1. 점수 저장
**POST** `/api/scores`

게임 종료 후 점수를 서버에 저장합니다.

**요청:**
```json
{
  "nickname": "PLAYER_NAME",
  "score": 1500,
  "stats": {
    "totalHits": 45,
    "maxCombo": 12,
    "maxBallSpeed": 11.2,
    "avgBallSpeed": 7.8,
    "accuracy": 95,
    "gameTime": 120000
  }
}
```

**응답:**
```json
{
  "success": true,
  "score": 1500,
  "rank": 5
}
```

### 2. 글로벌 랭킹 조회
**GET** `/api/rankings?limit=100`

상위 플레이어들의 랭킹을 조회합니다.

**응답:**
```json
[
  {
    "rank": 1,
    "name": "ALICE",
    "score": 2500,
    "games": 5,
    "avgScore": 2200
  },
  {
    "rank": 2,
    "name": "BOB",
    "score": 2200,
    "games": 8,
    "avgScore": 1850
  }
]
```

### 3. 플레이어 상세 정보
**GET** `/api/player/:nickname`

특정 플레이어의 상세 통계와 최근 점수를 조회합니다.

**응답:**
```json
{
  "nickname": "ALICE",
  "bestScore": 2500,
  "gamesPlayed": 5,
  "avgScore": 2200,
  "rank": 1,
  "recentScores": [
    {
      "score": 2500,
      "totalHits": 78,
      "maxCombo": 25,
      "maxBallSpeed": 12.5,
      "accuracy": 96,
      "date": "2026-05-10T16:30:00Z"
    }
  ]
}
```

### 4. 상위 3명 조회
**GET** `/api/top3`

빠른 조회용 상위 3명의 정보입니다.

**응답:**
```json
[
  {
    "rank": 1,
    "name": "ALICE",
    "score": 2500,
    "games": 5
  },
  {
    "rank": 2,
    "name": "BOB",
    "score": 2200,
    "games": 8
  },
  {
    "rank": 3,
    "name": "CHARLIE",
    "score": 1900,
    "games": 3
  }
]
```

### 5. 헬스 체크
**GET** `/api/health`

서버 상태를 확인합니다.

**응답:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-10T16:30:00Z"
}
```

## 💾 데이터베이스

SQLite 데이터베이스를 사용합니다:

```
scores.db
├── scores (게임 기록)
│   ├── id
│   ├── nickname
│   ├── score
│   ├── totalHits
│   ├── maxCombo
│   ├── maxBallSpeed
│   ├── avgBallSpeed
│   ├── accuracy
│   ├── gameTime
│   └── date
│
└── players (플레이어 정보)
    ├── id
    ├── nickname
    ├── bestScore
    ├── gamesPlayed
    ├── totalScore
    └── lastPlayDate
```

## 🔧 설정

### 포트 변경
```bash
PORT=8080 npm start
```

### 원격 접속 설정 (AWS Elastic IP)
1. 보안 그룹에서 포트 3000 열기
2. 탄력 IP 주소로 접속: `http://<탄력IP>:3000`

## 🎮 게임 사용법

### 싱글 플레이 (로컬)
1. 닉네임 입력
2. 캐릭터 선택
3. 게임 플레이
4. 점수가 자동으로 서버에 저장됨

### 멀티 플레이 (여러 디바이스)
1. 다른 디바이스에서 같은 탄력 IP 주소로 접속
2. 각 디바이스에서 다른 닉네임으로 플레이
3. 모든 점수가 글로벌 랭킹에 통합됨

## 📈 게임 통계

각 게임마다 다음 통계가 기록됩니다:

- **TIME**: 게임 지속 시간
- **HITS**: 총 히트 수
- **MAX COMBO**: 최장 연속 성공
- **MAX SPEED**: 공의 최대 속도
- **AVG SPEED**: 공의 평균 속도
- **ACCURACY**: 히트 정확도 (%)

## 🛠️ 문제 해결

### 서버가 실행되지 않음
```bash
# 포트 확인
lsof -i :3000

# 강제 종료
kill -9 <PID>
```

### 데이터베이스 초기화
```bash
rm scores.db
npm start
```

### 서버 로그 확인
```bash
# 포그라운드에서 실행하여 로그 확인
npm start
```

## 📝 라이선스

WAMUSE TENNIS © 2026

## 👨‍💻 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Deployment**: AWS Elastic IP

---

**버전**: 1.0.0  
**마지막 업데이트**: 2026-05-10
