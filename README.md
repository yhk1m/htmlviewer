# HTML 미리보기 · 배포

**편집기(수강생용):** https://yhk1m.github.io/htmlviewer/

HTML을 붙여넣으면 바로 미리보기가 되고, 버튼 하나로 GitHub Pages에 배포합니다.
배포할 때마다 저장소에 `1/index.html`, `2/index.html` … 이 차례로 커밋되어
`https://yhk1m.github.io/htmlviewer/1/` 처럼 번호가 붙은 하위 페이지가 생깁니다.

관리자 페이지는 화면 어디에도 링크가 없고, 주소 끝에 `admin`을 붙여야만 들어갑니다.
`https://yhk1m.github.io/htmlviewer/admin` → 중계 서버 주소(`htmlviewer-relay.vercel.app/admin`)로 자동 이동.

## 구조

```
수강생 브라우저 ──(HTML)──▶ 중계 서버 (Vercel, 토큰 보관) ──▶ GitHub 저장소 ──▶ GitHub Pages
선생님 브라우저 ──(토큰)──▶ 관리자 페이지 (Vercel 주소) ──────▶ GitHub 저장소
```

- 수강생 화면에는 토큰이 없습니다. 중계 서버가 대신 커밋하고, 수강생은 **새 페이지 만들기**와
  **방금 자기가 만든 페이지 덮어쓰기**만 할 수 있어요. 덮어쓰기 키는 만든 사람에게만 발급되고,
  관리자가 그 페이지를 고치거나 지우면 저절로 무효가 됩니다.
- 관리자 페이지는 배포 페이지(github.io)와 **다른 주소**에서 열려서, 수강생이 올린 HTML 속 스크립트가
  선생님 토큰을 읽을 수 없습니다.

| 파일 | 역할 |
|---|---|
| `index.html` | 편집기 — HTML 작성·미리보기·배포 (중계 서버 사용) |
| `admin.html` | 관리자 — 목록·검색·수정·삭제 (토큰으로 GitHub 직접) |
| `config.js` | 저장소·주소·중계 서버 주소 설정 |
| `core.js`, `app.css` | 공통 로직·스타일 |
| `relay/` | 중계 서버 (Vercel 함수 `/api/deploy`, `/api/update`, 관리자 페이지 프록시) |

## 중계 서버 환경변수 (Vercel 프로젝트 `htmlviewer-relay`)

| 이름 | 내용 |
|---|---|
| `GITHUB_TOKEN` | Fine-grained 토큰 — 저장소 `htmlviewer`만, **Contents: Read and write** |
| `EDIT_SECRET` | 덮어쓰기 키 서명용 무작위 문자열 (설정됨) |
| `DEPLOY_CODE` | (선택) 정하면 수강생이 처음 배포할 때 이 강의 코드를 물어봅니다 |
| `ALLOWED_ORIGINS` | (선택) 기본 `https://yhk1m.github.io` |
| `MAX_BYTES` | (선택) 한 페이지 최대 크기, 기본 2MB |

환경변수를 바꾼 뒤에는 `relay` 폴더에서 `vercel deploy --prod` 로 다시 배포해야 적용됩니다.
토큰이 만료되면 새로 발급해 `GITHUB_TOKEN`만 바꾸면 됩니다.

## 관리자 페이지
- 비밀번호(Vercel 환경변수 `ADMIN_PASSWORD`)로 들어갑니다. 12시간 유지, 토큰 입력 없음.
- 배포된 페이지가 최신 번호순으로, 각 페이지의 `<title>`이 제목으로 보여요.
- **검색**(번호·제목), **수정**(코드+미리보기, 같은 주소에 덮어쓰기), **삭제 / 선택 삭제**.
- `admin?edit=3` 처럼 열면 3번 수정 창이 바로 열려요.

## 알아둘 점
- **번호**: 1부터 시작해 "비어 있는 가장 작은 번호"를 씁니다. 수업 중 여러 명이 동시에 눌러도 번호가 겹치지 않게 재시도합니다.
  페이지를 지우면 그 번호는 다음 배포가 다시 씁니다. (지운 페이지의 옛 링크가 새 페이지로 열리게 되니 주의)
- 반영까지 보통 30초~2분 걸려요. 편집기 하단에 링크와 복사 버튼이 나옵니다.
- 한 페이지는 `index.html` 하나입니다. 이미지는 외부 URL이나 data URI로 넣어 주세요.
- 저장소가 Public이라 배포된 페이지는 누구나 볼 수 있어요.
