# 사주 해석 엔진 & DB 가이드

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [계산 모듈](#계산-모듈)
3. [DynamoDB 스키마](#dynamodb-스키마)
4. [템플릿 DB 상세](#템플릿-db-상세)
5. [API 흐름](#api-흐름)
6. [로컬 개발 환경](#로컬-개발-환경)
7. [시딩 (데이터 투입)](#시딩-데이터-투입)
8. [향후 LLM 연동](#향후-llm-연동)

---

## 아키텍처 개요

```
사용자 입력 (생년월일, 시간, 성별, 도시)
  │
  ▼
┌─────────────────────────────────────────────┐
│  계산 엔진 (js/)                             │
│  saju.js → sipsin.js → sinsal.js            │
│          → relations.js → daeun.js          │
│          → yongsin.js                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  DynamoDB (saju-templates)                   │
│  412개 해석 템플릿 조회                       │
│  type + key → content                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  [향후] LLM (Claude API)                     │
│  계산 결과 + 템플릿 → 자연어 해석 생성         │
└─────────────────────────────────────────────┘
```

### 핵심 원칙

- **계산 로직**은 `js/` 디렉토리에 순수 함수로 구현 (DOM 의존성 없음)
- **해석 텍스트**는 `data/` 디렉토리에 JS 모듈로 관리, DynamoDB에 시딩
- **api/**는 Express 서버 + DynamoDB 연동
- 프론트엔드와 백엔드 모두 `js/` 모듈을 공유 (single source of truth)

---

## 계산 모듈

### 파일 구조

```
js/
├── saju.js         # 사주 4주(四柱) 계산 — 년주·월주·일주·시주
├── lunar.js        # 절기(節氣) 계산 — VSOP87 기반 태양 황경
├── solar-time.js   # 진태양시(眞太陽時) 보정 — 경도 + 균시차
├── sipsin.js       # 십신(十神) 계산 — 격국·지지장간 포함
├── sinsal.js       # 신살(神殺) 탐지 — 16종
├── relations.js    # 합충형파해 — 삼합·육합·충·형·파·해
├── daeun.js        # 대운(大運) 계산 — 10년 주기
└── yongsin.js      # 용신(用神) 선정 — 일간 강약 + 용신/기신
```

### 모듈별 주요 함수

| 모듈 | 함수 | 설명 |
|---|---|---|
| `saju.js` | `computeFourPillars({ birthDate, zodiac, birthTime, city })` | 4주 계산 |
| `saju.js` | `getDominantElement(pillars)` | 주도 오행 |
| `sipsin.js` | `getTenGod(dayStem, targetStem)` | 두 천간의 십신 관계 |
| `sipsin.js` | `analyzeTenGods(pillars)` | 4주 전체 십신 + 격국 + 분포 |
| `sinsal.js` | `analyzeSinSal(pillars)` | 신살 16종 탐지 |
| `relations.js` | `analyzeRelations(pillars)` | 합충형파해 전체 분석 |
| `daeun.js` | `calculateDaeUn(pillars, gender, birthDate)` | 대운 주기 생성 |
| `yongsin.js` | `selectYongSin(pillars)` | 용신/기신 선정 + 추천 |
| `yongsin.js` | `calculateDayMasterStrength(pillars)` | 일간 강약 점수 (0~100) |

### 십신 관계 규칙

```
일간 기준:
  같은 오행, 같은 음양 → 비견    같은 오행, 다른 음양 → 겁재
  내가 생하는, 같은 음양 → 식신  내가 생하는, 다른 음양 → 상관
  내가 극하는, 같은 음양 → 편재  내가 극하는, 다른 음양 → 정재
  나를 극하는, 같은 음양 → 편관  나를 극하는, 다른 음양 → 정관
  나를 생하는, 같은 음양 → 편인  나를 생하는, 다른 음양 → 정인
```

### 대운 방향 규칙

```
양남(陽男) = 연간이 양(甲丙戊庚壬) + 남자 → 순행
음녀(陰女) = 연간이 음(乙丁己辛癸) + 여자 → 순행
음남(陰男) = 연간이 음 + 남자 → 역행
양녀(陽女) = 연간이 양 + 여자 → 역행
```

### 일간 강약 점수 배점

| 항목 | 배점 | 기준 |
|---|---|---|
| 월령(月令) 강도 | ±40점 | 일간 오행 vs 월지 오행 |
| 비겁(比劫) 수 | +25점 | 같은 오행 천간/지지 수 |
| 인성(印星) 수 | +20점 | 나를 생하는 오행 수 |
| 설기(洩氣) 감점 | -15점 | 내가 생/극하는 오행 수 |

결과: very_strong(80+) / strong(65+) / medium(40+) / weak(25+) / very_weak(0+)

---

## DynamoDB 스키마

### AWS 리전 & 테이블

| 항목 | 값 |
|---|---|
| **리전** | `ap-northeast-2` (서울) |
| **계정** | `887078546492` |

### 테이블 3개

#### 1. `saju-templates` — 해석 템플릿

| Key | Type | 설명 |
|---|---|---|
| **PK** | `type` (String) | 템플릿 타입 (예: `day_stem`, `gtbg`) |
| **SK** | `key` (String) | 템플릿 키 (예: `甲`, `甲_寅`) |
| `content` | Map | 해석 내용 JSON |
| `updatedAt` | String | 최종 수정일 ISO |

과금: `PAY_PER_REQUEST` (온디맨드)

#### 2. `saju-users` — 유저 프로필

| Key | Type | 설명 |
|---|---|---|
| **PK** | `userId` (String) | 유저 ID |
| `profile` | Map | `{ gender, birthDate, zodiac, city }` |
| `createdAt` | String | |
| `updatedAt` | String | |

#### 3. `saju-readings` — 감정 이력

| Key | Type | 설명 |
|---|---|---|
| **PK** | `userId` (String) | 유저 ID |
| **SK** | `readingId` (String) | 감정 ID (UUID) |
| `input` | Map | 입력 데이터 |
| `pillars` | Map | 4주 결과 |
| `dominant` | String | 주도 오행 |
| `detail` | Map | 해석 결과 |
| `createdAt` | String | |

### 환경변수

```bash
AWS_REGION=ap-northeast-2        # 기본값
USERS_TABLE=saju-users           # 기본값
READINGS_TABLE=saju-readings     # 기본값
TEMPLATES_TABLE=saju-templates   # 기본값
```

AWS 자격증명은 IAM 역할 또는 환경변수로:
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

---

## 템플릿 DB 상세

### 전체 현황 (412개)

| type | 개수 | SK (key) 예시 | 설명 |
|---|---|---|---|
| `day_stem` | 10 | `甲`, `乙`, ... `癸` | 일간별 성격/직업/대인/재물/건강 |
| `ten_god` | 10 | `비견`, `겁재`, ... `정인` | 십신별 의미/성격/직업/관계/재물/건강 |
| `structure` | 10 | `건록격`, `식신격`, ... `정인격` | 격국별 요약/상세/강점/약점/조언 |
| `day_pillar` | 60 | `甲子`, `乙丑`, ... `癸亥` | 60갑자 일주별 성격/배우자운/강점 |
| `ten_god_position` | 10 | `비견`, `식신`, ... | 십신이 년/월/일지/시에 있을 때 해석 |
| `element_balance` | 10 | `Wood_excess`, `Wood_deficient`, ... | 오행 과다/부족 해석 |
| `sinsal` | 15 | `천을귀인`, `도화살`, ... | 신살 16종 해석 |
| `relation` | 25 | `화국삼합`, `자오충`, `무은지형`, ... | 합충형파해 해석 |
| `nayin` | 60 | `甲子`, `乙丑`, ... `癸亥` | 납음(納音) 60갑자 오행 |
| `yongsin` | 5 | `very_strong`, `strong`, `medium`, `weak`, `very_weak` | 일간 강약별 용신 해석 |
| `gtbg` | 120 | `甲_寅`, `甲_卯`, ... `癸_丑` | 궁통보감 일간×월지 해석 |
| `sipsin_pattern` | 20 | `식신생재`, `관인상생`, `상관견관`, ... | 십신 조합 패턴 해석 |
| `twelve_stages` | 12 | `장생`, `목욕`, `관대`, ... `양` | 12운성 해석 |
| `stem_combo` | 5 | `갑기합`, `을경합`, ... `무계합` | 천간합 5쌍 해석 |
| `gender_ten_god` | 20 | `비견_male`, `비견_female`, ... | 십신 × 성별 육친 해석 |
| `gender_sinsal` | 12 | `도화살_male`, `도화살_female`, ... | 신살 × 성별 해석 |
| `gender_position` | 8 | `year_male`, `year_female`, ... | 4주 위치 × 성별 해석 |

### 성별 차이가 반영되는 항목

같은 십신이라도 남녀에 따라 **육친(六親)** 관계가 다릅니다:

| 십신 | 남자 육친 | 여자 육친 |
|---|---|---|
| 정재 | **아내** | 아버지 |
| 편재 | 아버지/첩 | 시아버지 |
| 정관 | 딸/직장 | **남편** |
| 편관 | 아들 | 애인/재혼상대 |
| 식신 | 할머니/후배 | **딸** |
| 상관 | 할아버지 | **아들** |
| 정인 | 어머니 | 어머니 |
| 편인 | 계모 | 계모/시어머니 |

### 궁통보감 (窮通寶鑑) 데이터

사주 해석의 핵심. 같은 일간이라도 **태어난 달(월지)** 에 따라 필요한 오행이 완전히 다릅니다.

- key 형식: `甲_寅` (일간_월지)
- 10일간 × 12월지 = 120개
- 각 항목에 `needed` (필요한 천간)과 `yongsin` (용신 오행) 포함

예시:
```
甲_午 (한여름의 갑목):
  "불에 타들어가는 나무. 반드시 물(Water)이 있어야 생존합니다."
  용신: Water

甲_子 (한겨울의 갑목):
  "얼어붙은 땅에서 나무가 잠들어 있습니다. 화(Fire)가 없으면 아무것도 시작할 수 없습니다."
  용신: Fire
```

---

## API 흐름

### `POST /api/reading`

```
Request:
{
  "birthDate": "1990-05-15",
  "zodiac": "HORSE",
  "gender": "male",
  "city": "Seoul"
}

Response:
{
  "input": { ... },
  "pillars": {                    ← saju.js
    "year":  { "stem": "庚", "branch": "午", "element": "Metal" },
    "month": { "stem": "己", "branch": "巳", "element": "Earth" },
    "day":   { "stem": "壬", "branch": "午", "element": "Water" },
    "hour":  { "stem": "丙", "branch": "午", "element": "Fire" }
  },
  "dominant": "Metal",
  "detail": { ... },              ← 오행별 기존 해석
  "tenGods": {                    ← sipsin.js
    "structure": "편재격",
    "dominant": "정재",
    "summary": { "편인": 1, "정재": 3, "정관": 1, "편재": 2 },
    "pillars": { ... }
  },
  "templates": {                  ← DynamoDB 조회
    "dayStem": { "content": { "name": "임수", ... } },
    "structure": { "content": { "name": "편재격", ... } },
    "tenGods": { "편인": {...}, "정재": {...}, ... }
  }
}
```

### 서버 시작

```bash
cd api
npm install
node server.js
# → http://localhost:3000
```

---

## 로컬 개발 환경

### 필수 조건

- Node.js 18+
- AWS CLI 설정 완료 (DynamoDB 접근 권한)
- DynamoDB 테이블 3개 생성 완료

### DynamoDB 테이블 생성 (CLI)

```bash
# Templates
aws dynamodb create-table \
  --table-name saju-templates \
  --attribute-definitions \
    AttributeName=type,AttributeType=S \
    AttributeName=key,AttributeType=S \
  --key-schema \
    AttributeName=type,KeyType=HASH \
    AttributeName=key,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2

# Users
aws dynamodb create-table \
  --table-name saju-users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2

# Readings
aws dynamodb create-table \
  --table-name saju-readings \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=readingId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=readingId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2
```

### SDK 설치

```bash
cd api
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

---

## 시딩 (데이터 투입)

### 템플릿 시딩 스크립트

```bash
cd api
node scripts/seed-templates.js
```

출력 예시:
```
Seeding templates to DynamoDB...
  day_stem               10개
  ten_god                10개
  ...
  gender_position        8개
  ──────────────────────────────
  예상 총합                412개

Done! 412개 템플릿 시딩 완료.
```

### 데이터 소스 파일

```
data/
├── saju-templates.js          # 기본: 일간, 십신, 격국
├── saju-templates-extended.js # 60갑자, 십신 위치별, 오행 밸런스
├── saju-templates-advanced.js # 신살, 합충형파해, 납음, 용신
├── saju-templates-gtbg.js     # 궁통보감 일간×월지 120종
├── saju-templates-patterns.js # 십신 조합, 12운성, 천간합
└── saju-templates-gender.js   # 성별 십신, 성별 신살, 성별 궁위
```

### 템플릿 추가/수정 방법

1. 해당 `data/saju-templates-*.js` 파일에 데이터 추가
2. 새 type이면 `api/db.js`의 `seedTemplates()` 파라미터에 추가
3. `api/db.js`의 `typeMap`에 매핑 추가
4. `api/scripts/seed-templates.js`에서 import + allTemplates에 추가
5. `node scripts/seed-templates.js` 실행 (기존 데이터는 upsert)

---

## 향후 LLM 연동

계산 결과 + DB 템플릿을 Claude API에 전달하여 자연어 해석을 생성하는 구조:

```
1. 사용자 입력
2. computeFourPillars()     → 4주
3. analyzeTenGods()         → 십신, 격국
4. analyzeSinSal()          → 신살
5. analyzeRelations()       → 합충형파해
6. calculateDaeUn()         → 대운
7. selectYongSin()          → 용신
8. DynamoDB에서 관련 템플릿 조회
9. 모든 데이터를 Claude API 프롬프트에 전달
10. 자연어 종합 해석 생성 → 응답
```

프롬프트 예시:
```
당신은 사주 해석 전문가입니다. 아래 데이터를 바탕으로 자연스러운 한국어 사주 해석을 작성하세요.

[사주 데이터]
일간: 壬水 (임수) — 바다, 큰 강
격국: 편재격
월지: 巳 (사월, 초여름)

[궁통보감]
초여름의 임수. 물이 증발하기 시작합니다. 庚辛(금)으로 수원을 확보해야 합니다.

[용신]
일간 강약: very_weak (20점)
용신: Metal / Water
기신: Fire / Earth

[십신 분포]
정재: 3, 편재: 2, 편인: 1, 정관: 1

[신살]
천을귀인, 월덕귀인

[성별 해석 (남자)]
정재 = 아내. 정재가 3개로 아내 복이 좋으나 여자가 많을 수 있어 주의...

...종합 해석을 작성하세요.
```

---

## 참고 오픈소스

| 프로젝트 | 채택 내용 |
|---|---|
| [hjsh200219/fortuneteller](https://github.com/hjsh200219/fortuneteller) | 신살 16종, 대운, 용신, 일간 강약, 격국 분류 |
| [china-testing/bazi](https://github.com/china-testing/bazi) | 납음 60종, 삼명통회 기반 해석 구조 |
| [cantian-ai/bazi-mcp](https://github.com/cantian-ai/bazi-mcp) | 형충합회 관계 데이터 |
| [urstory/manseryeok-js](https://github.com/urstory/manseryeok-js) | 만세력 데이터 구조 참고 |
