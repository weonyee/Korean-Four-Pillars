/**
 * llm.js — Claude API를 통한 사주 해석 생성.
 *
 * 1. S3에서 templates.json 로드
 * 2. 분석 데이터에 맞는 템플릿 선별
 * 3. Lambda 프록시를 통해 Claude API 호출
 */

let _templatesCache = null;

const ELEMENT_KO = { Wood: '목', Fire: '화', Earth: '토', Metal: '금', Water: '수' };

/**
 * S3에서 templates.json을 로드합니다 (캐시됨).
 */
async function loadTemplates() {
  if (_templatesCache) return _templatesCache;
  const res = await fetch('/data/templates.json');
  if (!res.ok) throw new Error('Failed to load templates.json');
  _templatesCache = await res.json();
  return _templatesCache;
}

/**
 * 분석 결과에 맞는 템플릿만 선별합니다.
 */
function selectRelevantTemplates(templates, pillars, tenGods, yongsin, sinsal, relations) {
  const selected = {};

  // 일간 템플릿
  const dayStem = pillars.day.stem;
  if (templates.day_stem?.[dayStem]) {
    selected.일간 = templates.day_stem[dayStem];
  }

  // 일간×강약
  if (yongsin?.strength && templates.day_stem_strength) {
    const key = `${dayStem}_${yongsin.strength.level}`;
    if (templates.day_stem_strength[key]) {
      selected.일간강약 = templates.day_stem_strength[key];
    }
  }

  // 격국
  const structure = tenGods?.structure;
  if (structure) {
    if (templates.structure?.[structure]) {
      selected.격국 = templates.structure[structure];
    }
    // 일간×격국
    const dsKey = `${dayStem}_${structure}`;
    if (templates.day_stem_structure?.[dsKey]) {
      selected.일간격국 = templates.day_stem_structure[dsKey];
    }
    // 격국×강약
    if (yongsin?.strength && templates.structure_strength) {
      const ssKey = `${structure}_${yongsin.strength.level}`;
      if (templates.structure_strength[ssKey]) {
        selected.격국강약 = templates.structure_strength[ssKey];
      }
    }
  }

  // 용신
  if (yongsin?.yongsin && templates.day_stem_yongsin) {
    const ysKey = `${dayStem}_${yongsin.yongsin.primary}`;
    if (templates.day_stem_yongsin[ysKey]) {
      selected.용신 = templates.day_stem_yongsin[ysKey];
    }
  }

  // 십신 (주요 십신들)
  if (tenGods?.summary && templates.ten_god) {
    selected.십신 = {};
    for (const god of Object.keys(tenGods.summary)) {
      if (templates.ten_god[god]) {
        selected.십신[god] = templates.ten_god[god];
      }
    }
  }

  // 신살
  if (sinsal?.length && templates.sinsal) {
    selected.신살 = {};
    for (const s of sinsal) {
      if (templates.sinsal[s.name]) {
        selected.신살[s.name] = templates.sinsal[s.name];
      }
    }
  }

  // 궁통보감 (일간 + 월지)
  if (templates.gtbg) {
    const monthBranch = pillars.month.branch;
    const gtbgKey = `${dayStem}_${monthBranch}`;
    if (templates.gtbg[gtbgKey]) {
      selected.궁통보감 = templates.gtbg[gtbgKey];
    }
  }

  // 일주 (60갑자)
  if (templates.day_pillar) {
    const dpKey = `${dayStem}${pillars.day.branch}`;
    if (templates.day_pillar[dpKey]) {
      selected.일주 = templates.day_pillar[dpKey];
    }
  }

  return selected;
}

/**
 * Lambda 프록시를 통해 Claude API에 사주 해석을 요청합니다.
 *
 * @param {object} params
 * @param {object} params.pillars — 4주 데이터
 * @param {object} params.tenGods — 십신 분석
 * @param {object} params.yongsin — 용신 분석
 * @param {Array} params.sinsal — 신살
 * @param {object} params.relations — 합충형파해
 * @param {Array} params.daeun — 대운
 * @param {string} params.gender
 * @param {string} params.birthDate
 * @param {string} params.birthTime
 * @param {string} params.city
 * @param {string} params.apiUrl — Lambda function URL
 * @returns {Promise<string>} 마크다운 해석 텍스트
 */
export async function generateInterpretation({
  pillars, tenGods, yongsin, sinsal, relations, daeun,
  gender, birthDate, birthTime, city, apiUrl,
}) {
  // 1. 템플릿 로드 + 선별
  const allTemplates = await loadTemplates();
  const selected = selectRelevantTemplates(allTemplates, pillars, tenGods, yongsin, sinsal, relations);

  // 2. Lambda 호출
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisData: { pillars, tenGods, yongsin, sinsal, relations, daeun },
      templates: selected,
      gender,
      birthDate,
      birthTime,
      city,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error ${response.status}`);
  }

  const result = await response.json();
  return result.interpretation;
}
