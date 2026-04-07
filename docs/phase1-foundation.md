# Phase 1 — 기반 구축

> 기간: 프로젝트 시작 ~ UI 초안
> 커밋: `70cb1b8` ~ `6d5f71b`

## 목표

사주(四柱) 서비스의 프론트엔드 기초 구축.

## 완료 항목

### UI 초안 (`70cb1b8`)
- Material Design 3 기반 입력 폼 (생년월일, 성별, 도시, 시간대)
- 12지신 동물 시간 선택 버튼
- 결과 페이지 레이아웃 (4주 테이블, 운세, 조언)

### API 구조 (`f7ebd8b`)
- `js/api.js` — localStorage 어댑터 (API 서버 없이 프론트 단독 동작)
- `js/result.js` — 결과 페이지 진입점
- `js/result-render.js` — HTML 빌더 (순수 함수)

### 도시 자동완성 (`a36878e`)
- `js/cities-data.js` — 번들된 도시 목록
- `js/city-search.js` — 클라이언트 사이드 즉시 필터링

### 모바일 대응 (`e8889d5`, `6d5f71b`)
- 반응형 레이아웃, 그리드 조정
- 터치 UX 개선

## 기술 스택

- 순수 HTML/CSS/JS (ES 모듈)
- Tailwind CSS (CDN)
- S3 + CloudFront 정적 호스팅

## 파일 구조

```
index.html          — 입력 페이지
result.html         — 결과 페이지
js/
  saju.js           — 사주 계산 (자체 수학 공식)
  ui.js             — DOM 이벤트
  api.js            — 로컬 스토리지 어댑터
  result.js         — 결과 페이지 로직
  result-render.js  — 결과 HTML 생성
  city-search.js    — 도시 검색
  cities-data.js    — 도시 데이터
```
