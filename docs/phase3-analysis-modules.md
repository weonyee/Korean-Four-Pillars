# Phase 3 — 분석 모듈 & 해석 템플릿 DB

> 커밋: `e654289` ~ `38e5cf5`

## 목표

십신, 신살, 합충형파해, 대운, 용신 분석 모듈 구축 및 412개 해석 템플릿 DB 생성.

## 완료 항목

### 분석 모듈 (js/)

| 모듈 | 기능 | 핵심 함수 |
|------|------|----------|
| `sipsin.js` | 십신(十神) 계산 | `analyzeTenGods()` — 일간 기준 8글자 십신 판별, 격국 판단 |
| `sinsal.js` | 신살(神殺) 감지 | `analyzeSinSal()` — 16종 신살 탐지 (천을귀인, 역마살 등) |
| `relations.js` | 합충형파해 | `analyzeRelations()` — 삼합, 육합, 충, 형, 파, 해 |
| `daeun.js` | 대운(大運) 계산 | `calculateDaeUn()` — 10년 주기 대운, 순행/역행 |
| `yongsin.js` | 용신(用神) 선정 | `selectYongSin()` — 일간 강약 점수 + 용신/희신/기신 |

### 해석 템플릿 DB (DynamoDB → S3)

처음에 DynamoDB `saju-templates` 테이블에 저장했으나, 정적 데이터 특성상 S3 JSON으로 이관.

**초기 412개 템플릿 (17개 카테고리):**

| 카테고리 | 수량 | 설명 |
|----------|------|------|
| day_stem | 10 | 일간(甲~癸) 성격·직업·건강 |
| ten_god | 10 | 십신 10종별 해석 |
| structure | 10 | 격국 10종별 해석 |
| day_pillar | 60 | 60갑자 일주별 해석 |
| ten_god_position | 10 | 십신×위치 |
| element_balance | 10 | 오행 과다/부족 |
| sinsal | 15 | 신살 해석 |
| relation | 25 | 합충형파해 해석 |
| nayin | 60 | 납음 60갑자 |
| yongsin | 5 | 용신 해석 |
| gtbg | 120 | 궁통보감 (10간×12월) |
| sipsin_pattern | 20 | 십신 조합 패턴 |
| twelve_stages | 12 | 12운성 |
| stem_combo | 5 | 천간합 |
| gender_ten_god | 20 | 십신×성별 |
| gender_sinsal | 12 | 신살×성별 |
| gender_position | 8 | 4궁×성별 |

### 데이터 파일 (data/)

```
data/
  saju-templates.js          — 기본 (일간, 십신, 격국)
  saju-templates-extended.js — 일주 60갑자, 십신위치, 오행밸런스
  saju-templates-advanced.js — 신살, 합충, 납음, 용신
  saju-templates-patterns.js — 십신패턴, 12운성, 천간합
  saju-templates-gender.js   — 성별 특화
  saju-templates-gtbg.js     — 궁통보감
```
