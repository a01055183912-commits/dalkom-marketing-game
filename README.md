# 달콤상점 마케팅 게임 (롯데 LIFT 3-3)

실습지 쓰기 · RFM 표 읽기 · 강사 화면 · 게임 5종을 한 페이지로 제공하는 수업용 웹앱입니다.
외부 패키지 없이 Node.js 기본 기능만 사용합니다.

## Railway 배포 순서
1. 이 폴더를 GitHub 저장소로 올립니다. (GitHub 웹에서 새 저장소 → "Upload files"로 폴더 내용 전체를 끌어다 놓기)
2. railway.app 로그인 → New Project → Deploy from GitHub repo → 방금 만든 저장소 선택
3. 서비스 → Settings → Networking → Generate Domain 을 누르면 접속 주소가 생깁니다.
4. 서비스 → Variables 에 추가
   - DATA_DIR = /data
5. 서비스 → Settings → Volumes → Add Volume, Mount path /data
   - 볼륨을 붙이지 않으면 재배포할 때 조별로 쓴 실습지가 지워집니다.

## 로컬에서 실행
node server.js   → http://localhost:3000

## 참고
- 로그인 기능은 없습니다. 주소를 아는 사람은 누구나 열 수 있으니 수업 중에만 주소를 공유하세요.
- 강사 화면 → ① 오늘 진행 순서 맨 아래 "수업 데이터 초기화"로 다음 반 수업 전에 모든 조의 기록을 지울 수 있습니다. (비밀번호 없이 확인 창만 뜹니다. 주소를 아는 누구나 누를 수 있으니 주의하세요.)
