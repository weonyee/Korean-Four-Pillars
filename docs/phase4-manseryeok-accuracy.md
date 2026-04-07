# Phase 4 — 만세력 정확도 개선

> 커밋: `0a7047e`

## 목표

자체 수학 공식의 오차 문제를 해결하여 만세력 계산 정확도를 확보.

## 문제

Phase 2의 자체 계산 방식에서 다음 오차 발생:
- 월주 천간: 연상기월법 오프셋 +2 누락 → 2칸씩 밀림
- 일주: JDN 계산에서 일부 날짜 불일치
- `manseryeok` npm 패키지 시도 → **입춘/절기 기준을 사용하지 않아** 한국 사주와 불일치

## 해결

**`@fullstackfamily/manseryeok`** 패키지 채택 (고영창 진짜만세력 + KASI 데이터 기반).

```
npm install @fullstackfamily/manseryeok
```

특징:
- **입춘(立春) 기준** 년주 변경 ✅
- **절기(節氣) 기준** 월주 변경 ✅
- **진태양시** 자동 보정 ✅
- KASI(한국천문연구원) 데이터 기반 정확도 ✅
- 1900~2050년 지원

### 검증 결과

```
2001-02-01 03시 (제주):
  년: 庚辰 ✅ (입춘 전 → 2000년)
  월: 己丑 ✅ (절기 기준 축월)
  일: 乙未 ✅
  시: 丁丑 ✅ (진태양시 03:04→02:28 → 축시)
```

## 빌드 시스템

manseryeok은 npm 패키지이므로 브라우저에서 직접 사용 불가 → **esbuild** 도입.

```
node build.mjs
```

- `js/*.js` → `dist/js/*.js` (번들링, ESM, code splitting)
- `*.html`, `*.css` → `dist/` (복사)
- 배포: `dist/` → S3

### deploy.sh 변경

```bash
npm run build          # esbuild 번들링
aws s3 sync dist/ ...  # dist/에서 업로드
```

## UI 변경

- 12지신 동물 선택 버튼 제거 → HH:MM 24시간제 숫자 입력으로 교체
- 시간 미입력 시 시주 미표시 (3주만 출력)
- Debug Preview 패널: 사주 계산 버튼 클릭으로 동작

## 핵심 파일

```
js/saju.js     — computeFourPillars()가 manseryeok의 calculateSaju() 사용
build.mjs      — esbuild 빌드 스크립트
package.json   — @fullstackfamily/manseryeok, esbuild 의존성
dist/          — 빌드 결과물 (배포용, .gitignore)
```
