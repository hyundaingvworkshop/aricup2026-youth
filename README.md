# 2026 과천아리컵 유소년부 웹앱 (Vercel 배포용)

1학년(6팀) · 2학년(8팀) 예선 → 4강 → 결승. 순위: 승점 → 골득실 → 다득점 → 추첨.

- 참가자용: `https://<프로젝트이름>.vercel.app/`
- 운영진용: `https://<프로젝트이름>.vercel.app/admin` (비밀번호 로그인)

결과는 무료 저장소(Upstash Redis)에 저장되고, 참가자 화면은 8초마다 자동으로 새 결과를 불러와요.
관리자 비밀번호는 코드에 들어 있지 않고 Vercel 환경변수 `ADMIN_PASSWORD`로만 확인해요.

---

## 배포 순서 (처음 한 번, 10분 정도)

### 1. GitHub에 올리기
1. GitHub에서 새 저장소를 만들어요. 예: `aricup2026-youth`.
2. 이 압축을 푼 폴더 안의 파일을 **모두** 저장소에 올려요. 웹에서 "Add file → Upload files"로 끌어다 놓으면 돼요.
   - `api` 폴더도 꼭 함께 올라가야 해요.

### 2. Vercel 프로젝트 만들기
1. vercel.com → **Add New… → Project** → 방금 만든 GitHub 저장소 **Import**.
2. Framework Preset은 **Other** 그대로 두고 **Deploy**.

### 3. 저장소(Upstash Redis) 연결
1. Vercel 프로젝트 화면 → **Storage** 탭 → **Create Database**(또는 Connect) → Marketplace의 **Upstash → Redis** 선택.
2. 무료 플랜으로 만든 뒤 **이 프로젝트에 연결(Connect)**. 환경은 Production, Preview 모두 선택해요.
3. 연결하면 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동으로 들어가요.
   - Upstash에서 직접 만들었다면 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 직접 넣어도 돼요.

### 4. 관리자 비밀번호 넣기
1. 프로젝트 → **Settings → Environment Variables**
2. Key: `ADMIN_PASSWORD`, Value: (운영진 비밀번호) → Save

### 5. 다시 배포
1. **Deployments** 탭 → 가장 최근 배포의 **⋯ → Redeploy**.
   - 환경변수는 다시 배포해야 적용돼요.
2. 끝! `/admin`에 들어가 운영진 비밀번호로 로그인해 보세요.

> GitHub 없이 하려면: 컴퓨터에 Node.js가 있으면 이 폴더에서 `npx vercel` → `npx vercel --prod`로도 배포할 수 있어요. 3~5단계는 똑같아요.

---

## 대회 전 점검
- [ ] `/admin` 로그인 → 아무 경기나 "경기 중"으로 저장 → 다른 폰에서 참가자 화면에 표시되는지 확인
- [ ] 같은 경기를 "예정"으로 되돌려서 테스트 기록 지우기
- [ ] 공지 저장 → 참가자 화면 맨 위에 나오는지 확인 → 비우고 저장
- [ ] 비밀번호를 바꾸고 싶으면 `ADMIN_PASSWORD` 수정 후 Redeploy
  - 이미 로그인된 기기는 다음 저장 때 다시 로그인하라고 나와요.

## 운영 참고
- 운영진 여러 명이 동시에 서로 다른 경기를 입력해도 덮어쓰지 않아요.
- 비밀번호를 8번 틀리면 그 인터넷 주소(IP)는 10분 동안 로그인이 잠겨요.
- 대회가 끝나고 기록을 지우려면 Upstash 콘솔에서 `arijr:`로 시작하는 키를 삭제하면 돼요.

## 파일 구성
| 파일 | 내용 |
|---|---|
| `index.html` | 참가자 화면 |
| `admin.html` | 운영 관리 화면 (`/admin`) |
| `app.js`, `app.css` | 화면 코드·스타일 |
| `layout.jpg`, `parking.jpg` | 대회장 배치도 · 주차 안내 |
| `api/state.js` | 현재 결과 불러오기 |
| `api/login.js` | 관리자 비밀번호 확인 |
| `api/op.js` | 결과·공지·추첨·4강 배정 저장 (비밀번호 필요) |
| `api/_lib.js` | 저장소 연결·비밀번호 확인 공통 코드 |
