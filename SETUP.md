# 🚀 WAMUSE TENNIS 서버 설정 가이드

## 현재 상태

✅ **서버 구축 완료**
- Node.js Express 서버: 포트 3000
- SQLite 데이터베이스: scores.db
- 글로벌 랭킹 시스템: 완성
- 멀티플레이어 지원: 활성화 ✓

---

## 📁 프로젝트 구조

```
/home/ubuntu/wamuse_tennis/
├── server.js                  # Express 서버 메인 파일
├── package.json              # npm 설정
├── ecosystem.config.js       # PM2 설정 (선택사항)
├── wamuse_tennis_game.html   # 게임 클라이언트 (수정됨)
├── scores.db                 # SQLite 데이터베이스
├── README.md                 # API 문서
├── SETUP.md                  # 이 파일
└── node_modules/             # npm 패키지들
```

---

## 🎮 게임 플레이 방법

### **로컬에서 플레이**
```bash
# 1. 서버가 실행 중인지 확인
curl http://localhost:3000/api/health

# 2. 브라우저에서 접속
http://localhost:3000
```

### **외부에서 플레이 (Elastic IP 사용)**
```
탄력 IP 주소로 접속:
http://<탄력IP>:3000

예: http://34.225.123.45:3000
```

---

## 🌐 멀티플레이어 게임 플로우

### 시나리오: 3명이 다른 디바이스에서 플레이

```
┌─────────────────────────────────────────────────┐
│  디바이스 A (집)    │ 디바이스 B (사무실) │  디바이스 C (카페)
│  탄력IP:3000      │ 탄력IP:3000      │  탄력IP:3000
└─────────────────────────────────────────────────┘
          ↓                  ↓                  ↓
      Alice 플레이      Bob 플레이      Charlie 플레이
      점수: 2500        점수: 2200        점수: 1900
          ↓                  ↓                  ↓
     ┌──────────────────────────────────────────┐
     │      중앙 서버 (Node.js + SQLite)         │
     │  모든 점수 저장 및 글로벌 랭킹 생성       │
     └──────────────────────────────────────────┘
          ↓
     전체 플레이어가 RANKING 버튼으로 확인 가능
     #1 Alice  - 2500
     #2 Bob    - 2200
     #3 Charlie- 1900
```

---

## 🔧 서버 관리

### 현재 상태 확인
```bash
# 포트 3000이 열려있는지 확인
lsof -i :3000

# 서버 헬스 체크
curl http://localhost:3000/api/health
```

### 서버 재시작
```bash
# 백그라운드 프로세스 찾기
ps aux | grep server.js

# 강제 종료
kill -9 <PID>

# 다시 시작
npm start
```

---

## 📊 데이터베이스 조회

### SQLite 직접 접근 (선택사항)
```bash
# 데이터베이스 열기
sqlite3 scores.db

# 랭킹 조회
SELECT nickname, bestScore, gamesPlayed 
FROM players 
ORDER BY bestScore DESC;

# 특정 플레이어의 모든 게임 기록
SELECT score, totalHits, maxCombo, date 
FROM scores 
WHERE nickname = 'ALICE' 
ORDER BY date DESC;
```

---

## 🚀 프로덕션 배포 (선택사항)

### PM2를 사용한 영구 실행
```bash
# PM2 설치 (처음 한 번만)
npm install -g pm2

# 서버 시작
pm2 start ecosystem.config.js

# 자동 시작 설정
pm2 startup
pm2 save

# 상태 모니터링
pm2 monit

# 로그 확인
pm2 logs wamuse-tennis
```

### systemd를 사용한 영구 실행
```bash
# /etc/systemd/system/wamuse-tennis.service 생성
sudo nano /etc/systemd/system/wamuse-tennis.service
```

파일 내용:
```ini
[Unit]
Description=WAMUSE Tennis Server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/wamuse_tennis
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

서비스 시작:
```bash
sudo systemctl start wamuse-tennis
sudo systemctl enable wamuse-tennis
sudo systemctl status wamuse-tennis
```

---

## 🔒 보안 설정

### AWS 보안 그룹 설정
1. AWS 콘솔 → EC2 → 보안 그룹
2. Inbound Rules 추가:
   - 유형: Custom TCP
   - 포트: 3000
   - 소스: 0.0.0.0/0 (모두 허용) 또는 특정 IP

### 방화벽 설정 (Linux)
```bash
# 포트 3000 허용
sudo ufw allow 3000/tcp

# 방화벽 상태 확인
sudo ufw status
```

---

## 📈 성능 최적화

### 데이터베이스 백업
```bash
# 정기적인 백업
cp scores.db scores.db.backup

# 자동 백업 스크립트 (cron)
0 2 * * * cp /home/ubuntu/wamuse_tennis/scores.db /home/ubuntu/wamuse_tennis/backups/scores_$(date +\%Y\%m\%d).db
```

### 용량 관리
```bash
# 데이터베이스 최적화
sqlite3 scores.db "VACUUM;"

# 디스크 사용량 확인
du -sh /home/ubuntu/wamuse_tennis/
```

---

## 🐛 문제 해결

### 포트 3000 이미 사용 중
```bash
# 포트 변경
PORT=8080 npm start

# HTML에서도 API_BASE 수정 필요:
# const API_BASE = 'http://localhost:8080';
```

### 서버가 응답하지 않음
```bash
# 로그 확인
tail -f /tmp/claude-1000/-home-ubuntu-wamuse-tennis/*/tasks/*/output

# 프로세스 재시작
kill -9 <PID> && npm start
```

### 데이터베이스 손상
```bash
# 백업본에서 복구
cp scores.db.backup scores.db

# 또는 초기화 (모든 데이터 삭제)
rm scores.db
npm start
```

---

## 📞 API 테스트

### 점수 저장 테스트
```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "TESTPLAYER",
    "score": 1500,
    "stats": {
      "totalHits": 50,
      "maxCombo": 10,
      "maxBallSpeed": 10.5,
      "avgBallSpeed": 7.2,
      "accuracy": 95,
      "gameTime": 120000
    }
  }'
```

### 랭킹 조회 테스트
```bash
curl http://localhost:3000/api/rankings

# 상위 5명만 조회
curl http://localhost:3000/api/rankings?limit=5
```

### 플레이어 정보 조회
```bash
curl http://localhost:3000/api/player/TESTPLAYER
```

---

## ✅ 체크리스트

- [x] Node.js 서버 구축 완료
- [x] SQLite 데이터베이스 설정 완료
- [x] 게임 클라이언트 서버 연동 완료
- [x] API 엔드포인트 개발 완료
- [x] 글로벌 랭킹 시스템 완성
- [ ] SSL/HTTPS 설정 (선택)
- [ ] 로그 모니터링 설정 (선택)
- [ ] 정기 백업 스크립트 (선택)

---

**🎉 축하합니다! 글로벌 멀티플레이어 테니스 게임 서버가 완성되었습니다!**

**다음 단계:**
1. 외부 디바이스에서 탄력 IP로 접속하여 테스트
2. 여러 명이 동시에 플레이하고 랭킹 확인
3. 필요시 PM2나 systemd로 서버 영구화

---

**버전**: 1.0.0  
**마지막 업데이트**: 2026-05-10
