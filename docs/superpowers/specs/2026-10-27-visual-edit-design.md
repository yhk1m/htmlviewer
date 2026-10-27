# 미리보기에서 직접 수정 (Visual Edit) — 설계

2026-10-27 · 사용자 승인: 범위 「글자 + 서식·이미지」, 방식 B(고친 요소만 원본 코드에서 바꿔 끼우기)

## 목표
미리보기 칸의 「편집」 토글을 켜면 페이지 글자를 클릭해 바로 고치고, 서식(굵게·기울임·밑줄·색·크기·링크·서식 지우기)과 이미지(주소·파일)를 바꿀 수 있다. 고친 내용은 왼쪽 코드의 **해당 요소 구간만** 바뀌고 나머지 코드는 한 글자도 바뀌지 않는다.

## 제약
- 미리보기 iframe 의 sandbox(allow-same-origin 없음)는 유지 → 부모와 iframe 은 postMessage 로만 대화.
- 서버·빌드 없음(정적 파일). parse5 는 jsdelivr ESM(`parse5@7.1.2/+esm`)을 편집 모드를 켤 때만 불러온다.
- 배포 본문은 Vercel 함수 한도(4.5MB) 안이어야 함 → 올린 이미지는 긴 변 1600px 로 줄여 WebP/JPEG data URL, 결과가 1.5MB 넘으면 경고.

## 구성
- `visual-edit.js` (부모, 순수 함수 + 연결)
  - `instrument(src)` → `{ html, map }`: parse5(sourceCodeLocationInfo)로 body 아래 요소(script·style·template·svg 내부 제외)에 문서 순서 번호를 매기고, 원본 시작 태그의 `>` 바로 앞에 ` data-hpe="i"` 를 끼운 문자열과 `map[i] = { tag, start, end, cStart, cEnd, attrs }`(원본 오프셋)를 돌려준다. 끝 태그가 없는 요소(`<li>` 등)는 cEnd = 요소 끝.
  - `applyInner(src, map, i, inner)`: `src` 의 `[cStart, cEnd)` 를 `inner` 로 바꾼 새 문자열.
  - `applyAttr(src, map, i, name, value)`: 시작 태그 안 해당 속성 값 구간만 바꾸거나, 없으면 시작 태그 끝에 추가.
  - `shift(map, a, b, len)`: 원본 `[a, b)` 를 길이 `len` 글자로 바꾼 뒤 map 오프셋을 맞춤 — 구간 안에 완전히 든 요소는 지우고, `b` 이상인 오프셋은 `len-(b-a)` 만큼 민다. 번호는 다시 매기지 않으므로 iframe 과 번호가 항상 같다.
- `visual-edit-frame.js` (iframe 안에 끼우는 스크립트, 부모가 fetch 해 srcdoc 끝에 인라인으로 넣음)
  - 편집 대상: 클릭한 지점에서 가장 가까운 `data-hpe` 요소 중 글자를 담는 것(p, h1–h6, li, td, th, dt, dd, figcaption, blockquote, a, button, label, span, div 등). 요소 안에 `data-hpe` 없는 요소(스크립트가 만든 것)가 있으면 잠금 → 「이 부분은 스크립트가 만든 내용이라 코드에서 수정하세요」 말풍선.
  - 클릭 → 그 요소만 contenteditable. 링크 이동·폼 제출은 편집 모드 동안 막음.
  - 빠져나올 때(blur) 혹은 입력 멈춘 지 0.6초 뒤, 시작 시점과 innerHTML 이 다르면 `data-hpe` 속성을 지운 innerHTML 을 `{type:'inner', id, html}` 로 보냄.
  - 서식 막대: Shadow DOM 으로 격리한 떠 있는 막대. 굵게·기울임·밑줄(execCommand), 글자색(styleWithCSS → span style), 크기 작게/보통/크게(선택을 `<span style="font-size:…em">` 로 감쌈), 링크(막대 안 입력칸), 서식 지우기.
  - 이미지 클릭 → 막대에 「이미지 바꾸기」: 주소 입력 또는 파일 선택. 파일은 iframe 안에서 canvas 로 줄여 data URL. `{type:'attr', id, name:'src', value}` 전송, 화면의 img 도 즉시 바꿈.
- `index.html`
  - 미리보기 머리줄에 「직접 수정」 토글 버튼. 켜면 render 가 instrument 결과 + 프레임 스크립트를 srcdoc 으로 씀. 끄면 지금처럼 원본 그대로.
  - 메시지는 `e.source === preview.contentWindow` 인 것만 받음. 받으면 code.value 갱신 → 초안 저장 → map 재계산. 이때 코드 입력 이벤트에 의한 다시 그리기는 하지 않음(편집 중 커서·스크롤 유지).
  - 번호 일치: 확정된 요소 k 의 안쪽 요소는 map 에서 지워지므로 iframe 도 k 안쪽의 `data-hpe` 를 지우고 k 에 `data-hpe-own` 을 붙인다(이후 k 는 잠금 검사 없이 통째로 편집). 코드 직접 타이핑·되돌리기는 다시 그리면서 번호를 새로 매긴다.
  - 되돌리기: 편집 중엔 브라우저 기본 Ctrl+Z. 확정된 수정은 부모가 code.value 이력을 쌓고, 막대의 「되돌리기」가 직전 값으로 돌리고 다시 그림.
  - 왼쪽 코드를 직접 타이핑하면 기존처럼 다시 그림(편집 모드면 다시 instrument).

## 오류 처리
- parse5 로드 실패 → 토글 끄고 상태줄에 「직접 수정 기능을 불러오지 못했어요」.
- 받은 id 가 map 에 없음 → 무시하고 다시 그림.

## 검증
- Node 로 instrument/applyInner/applyAttr 단위 확인(끝 태그 생략, 속성 따옴표 없음, 한글, 중첩, 스크립트 생성 요소).
- 헤드리스 Chrome 으로 실제 편집기: 토글 → 문단 수정 → 코드에 그 구간만 바뀜, 굵게, 이미지 교체, 연표 같은 스크립트 페이지에서 잠금 확인.
