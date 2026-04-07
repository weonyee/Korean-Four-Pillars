# Phase 2 — 사주 계산 엔진

> 커밋: `4760863` ~ `4da9c7d`

## 목표

만세력 기반의 정확한 사주 계산 시스템 구축.

## 완료 항목

### 절기(節氣) 기반 년주·월주 (`4760863`)
- `js/lunar.js` — 태양 황경 근사 계산으로 12절기 날짜 산출
- 년주: **입춘(立春)** 기준 연 변경 (1/1이 아님)
- 월주: 12절기마다 변경 (경칩→묘월, 청명→진월 등)
- `getSajuYear(date)`, `getSajuMonth(date)` 함수

### 코드 중복 제거 (`4760863`)
- `api/saju.js`의 94줄 중복 로직 → `js/saju.js` 재사용하는 6줄 래퍼로 교체
- API 서버를 ES 모듈로 전환 (`"type": "module"`)

### 진태양시(眞太陽時) 보정 (`4da9c7d`)
- `js/solar-time.js` — 200+ 도시의 경도 + UTC 오프셋 데이터
- 보정 공식: `진태양시 = 지방표준시 + (출생지경도 − 표준자오선) × 4분/° + 균시차`
- 예: 서울 13:00 KST → 진태양시 12:18 (−42분 보정)
- 시간 + 도시 입력 시 시주 자동 결정

## 한계 (이후 Phase 3에서 해결)

- 자체 수학 공식 기반 → 일부 경계값에서 오차 발생
- 일주(日柱) JDN 계산의 정확도 문제

## 핵심 파일

```
js/saju.js       — 4주 계산 (getYearPillar, getMonthPillar, getDayPillar, getHourPillar)
js/lunar.js      — 절기 날짜 계산 (태양 황경 기반)
js/solar-time.js — 진태양시 보정 (200+ 도시 경도 데이터)
api/saju.js      — js/saju.js를 재사용하는 thin wrapper
```
