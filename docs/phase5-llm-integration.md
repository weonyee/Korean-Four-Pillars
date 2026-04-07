# Phase 5 — LLM 연동 & 템플릿 확장

> 현재 진행 중

## 목표

사주 분석 데이터 + 해석 템플릿을 Claude API에 전달하여 일반인이 이해할 수 있는 자연어 사주 풀이를 생성.

## 완료 항목

### 템플릿 확장 (412 → 774개)

| 카테고리 | 수량 | 신규 | 설명 |
|----------|------|------|------|
| 기존 17개 | 412 | — | Phase 3에서 생성 |
| day_stem_strength | 50 | ✅ | 일간×강약 (10간×5단계) |
| day_stem_structure | 100 | ✅ | 일간×격국 (10간×10격국) |
| ten_god_position_ext | 40 | ✅ | 십신×4주 위치 |
| daeun | 22 | ✅ | 대운 천간 10 + 지지 12 |
| element_interaction | 25 | ✅ | 오행 상생상극 5×5 |
| day_stem_yongsin | 50 | ✅ | 일간×용신 오행 |
| structure_strength | 50 | ✅ | 격국×강약 |
| relation_position | 25 | ✅ | 합충형파해×위치 |

### S3 기반 템플릿 서빙

DynamoDB에서 S3 JSON으로 이관:
```
s3://bucket/data/templates.json (397KB, 774개 템플릿)
```
- 프론트에서 `fetch('/data/templates.json')` 로 직접 로드
- 빌드: `node scripts/export-templates-to-json.mjs`

### 데이터 파일 (신규)

```
data/
  saju-templates-strength.js   — 일간×강약 50 + 일간×격국 100
  saju-templates-position.js   — 십신×위치 40 + 대운 22
  saju-templates-relations2.js — 오행관계 25 + 용신 50 + 격국강약 50 + 합충위치 25
  templates.json               — 전체 통합 JSON (774개)
scripts/
  export-templates-to-json.mjs — data/*.js → templates.json 변환
```

### Claude API 연동

**아키텍처:**
```
프론트엔드
  ├── 사주 계산 (manseryeok)
  ├── 분석 모듈 (십신, 용신, 신살, 대운, 합충)
  ├── S3에서 templates.json 로드 → 관련 템플릿 선별
  └── Lambda 호출 (POST)
        │
Lambda (saju-interpret)
  ├── 분석 데이터 + 선별된 템플릿 → 프롬프트 조합
  ├── Claude API (Sonnet 4.5) 호출
  └── 자연어 해석 반환
```

**Lambda 함수:**
- 이름: `saju-interpret`
- Runtime: Node.js 20.x
- Function URL: `https://osq273me7kgslgfuuea4xj5dx40vqphp.lambda-url.ap-northeast-2.on.aws/`
- 환경변수: `ANTHROPIC_API_KEY`
- 모델: `claude-sonnet-4-5-20250929`
- 타임아웃: 90초

**프롬프트 구조:**
- System: 사주명리학 전문가 페르소나 + 작성 규칙
- User: 사주 원국 → 십신 → 용신 → 신살 → 합충 → 대운 → 관련 템플릿 → 풀이 요청
- 출력 섹션: 종합운세, 성격, 직업/재물, 연애, 건강, 시기별 운세, 조언

**프론트엔드 모듈:**
- `js/llm.js` — 템플릿 로드 + 선별 + Lambda 호출
- `js/ui.js` — Debug Preview에 "사주 계산" + "AI 사주 풀이 생성" 버튼

### 인프라

| 리소스 | 값 |
|--------|-----|
| 도메인 | https://saju.sedaily.ai |
| S3 버킷 | saju-oracle-frontend-887078546492 |
| CloudFront | E2ZDGPQU5JXQKC |
| ACM 인증서 | us-east-1 (saju.sedaily.ai) |
| Route 53 | Z07543813V4FC5RK599U0 (sedaily.ai) |
| Lambda | saju-interpret (ap-northeast-2) |

## 현재 상태

- ✅ Debug Preview에서 사주 계산 + AI 풀이 테스트 가능
- ⬜ 결과 페이지(result.html)에 LLM 풀이 반영
- ⬜ 프롬프트 튜닝 (사주 전문가 미팅 후)
- ⬜ 프로덕션 UI 디자인

## 향후 작업 (TODO.md 참조)

- 사주 전문가와 미팅 → 해석 품질 튜닝
- 결과 페이지 리디자인 (LLM 풀이 + 시각적 요소)
- 궁합, 년운 등 추가 기능
- 비용 최적화 (캐싱, 모델 선택)
