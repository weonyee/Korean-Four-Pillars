/**
 * sipsin.js — 십신(十神) calculation logic.
 * No DOM dependencies. All functions are stateless and exportable.
 *
 * 일간(日干)을 기준으로 나머지 천간·지지와의 관계를 산출합니다.
 * 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인
 */

import { HEAVENLY_STEMS, STEM_ELEMENTS } from './saju.js';

// ── 오행 관계 ────────────────────────────────────────────────────────────────

/** 상생(相生): A가 B를 생함 */
const GENERATES = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};

/** 상극(相剋): A가 B를 극함 */
const CONTROLS = {
  Wood: 'Earth', Fire: 'Metal', Earth: 'Water', Metal: 'Wood', Water: 'Fire',
};

// ── 지지장간(地支藏干) ───────────────────────────────────────────────────────
// 각 지지 안에 숨어있는 천간들. 첫 번째가 본기(本氣).

export const BRANCH_HIDDEN_STEMS = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

// ── 십신 이름 (한글 / 한자 / 영문) ──────────────────────────────────────────

export const TEN_GODS = {
  '비견': { hanja: '比肩', en: 'Companion' },
  '겁재': { hanja: '劫財', en: 'Rob Wealth' },
  '식신': { hanja: '食神', en: 'Eating God' },
  '상관': { hanja: '傷官', en: 'Hurting Officer' },
  '편재': { hanja: '偏財', en: 'Indirect Wealth' },
  '정재': { hanja: '正財', en: 'Direct Wealth' },
  '편관': { hanja: '偏官', en: 'Seven Killings' },
  '정관': { hanja: '正官', en: 'Direct Officer' },
  '편인': { hanja: '偏印', en: 'Indirect Seal' },
  '정인': { hanja: '正印', en: 'Direct Seal' },
};

// ── Core: 두 천간 사이의 십신 ────────────────────────────────────────────────

/**
 * 일간과 대상 천간의 십신 관계를 구합니다.
 * @param {string} dayStem  — 일간 (기준 천간, 예: '甲')
 * @param {string} targetStem — 대상 천간 (예: '庚')
 * @returns {string} 십신 이름 (예: '편관')
 */
export function getTenGod(dayStem, targetStem) {
  const dayIdx    = HEAVENLY_STEMS.indexOf(dayStem);
  const targetIdx = HEAVENLY_STEMS.indexOf(targetStem);
  if (dayIdx < 0 || targetIdx < 0) return '';

  const dayEl    = STEM_ELEMENTS[dayIdx];
  const targetEl = STEM_ELEMENTS[targetIdx];
  const samePol  = (dayIdx % 2) === (targetIdx % 2);

  if (dayEl === targetEl)               return samePol ? '비견' : '겁재';
  if (GENERATES[dayEl]    === targetEl) return samePol ? '식신' : '상관';
  if (CONTROLS[dayEl]     === targetEl) return samePol ? '편재' : '정재';
  if (CONTROLS[targetEl]  === dayEl)    return samePol ? '편관' : '정관';
  if (GENERATES[targetEl] === dayEl)    return samePol ? '편인' : '정인';

  return '';
}

// ── 지지의 십신 (본기 기준) ──────────────────────────────────────────────────

/**
 * 지지의 본기(장간 첫 번째)를 기준으로 십신을 구합니다.
 * @param {string} dayStem — 일간
 * @param {string} branch  — 지지 (예: '寅')
 * @returns {string} 십신 이름
 */
export function getBranchTenGod(dayStem, branch) {
  const hidden = BRANCH_HIDDEN_STEMS[branch];
  if (!hidden || hidden.length === 0) return '';
  return getTenGod(dayStem, hidden[0]);
}

/**
 * 지지의 모든 장간에 대한 십신을 구합니다.
 * @param {string} dayStem — 일간
 * @param {string} branch  — 지지
 * @returns {{ stem: string, tenGod: string }[]}
 */
export function getBranchHiddenTenGods(dayStem, branch) {
  const hidden = BRANCH_HIDDEN_STEMS[branch] || [];
  return hidden.map(stem => ({ stem, tenGod: getTenGod(dayStem, stem) }));
}

// ── 격국(格局) 판단 ─────────────────────────────────────────────────────────

/** 월지 본기의 십신 → 격국 이름 */
const STRUCTURE_MAP = {
  '비견': '건록격', '겁재': '양인격',
  '식신': '식신격', '상관': '상관격',
  '편재': '편재격', '정재': '정재격',
  '편관': '편관격', '정관': '정관격',
  '편인': '편인격', '정인': '정인격',
};

/**
 * 격국을 판단합니다 (월지 본기 기준).
 * @param {string} dayStem    — 일간
 * @param {string} monthBranch — 월지
 * @returns {string} 격국 이름 (예: '식신격')
 */
export function getStructure(dayStem, monthBranch) {
  const tenGod = getBranchTenGod(dayStem, monthBranch);
  return STRUCTURE_MAP[tenGod] || tenGod;
}

// ── 사주 전체 십신 분석 ─────────────────────────────────────────────────────

/**
 * 사주 4주 전체의 십신 배치를 분석합니다.
 *
 * @param {{ year, month, day, hour }} pillars — computeFourPillars() 결과
 * @returns {{
 *   pillars: { year, month, day, hour },  — 각 주의 { stem, branch, hiddenStems }
 *   structure: string,                     — 격국 이름
 *   summary: Record<string, number>,       — 십신 출현 횟수
 *   dominant: string,                      — 가장 많이 나온 십신
 * }}
 */
export function analyzeTenGods(pillars) {
  const dayStem = pillars.day.stem;

  const analysis = {};
  for (const pos of ['year', 'month', 'day', 'hour']) {
    const p = pillars[pos];
    analysis[pos] = {
      stem:   pos === 'day' ? '일간' : getTenGod(dayStem, p.stem),
      branch: getBranchTenGod(dayStem, p.branch),
      hiddenStems: getBranchHiddenTenGods(dayStem, p.branch),
    };
  }

  // 격국
  const structure = getStructure(dayStem, pillars.month.branch);

  // 십신 분포 요약 (천간 + 지지 본기)
  const counts = {};
  for (const pos of ['year', 'month', 'day', 'hour']) {
    const { stem, branch } = analysis[pos];
    if (stem && stem !== '일간') counts[stem]   = (counts[stem]   || 0) + 1;
    if (branch)                  counts[branch] = (counts[branch] || 0) + 1;
  }

  // 가장 많이 나온 십신
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  return { pillars: analysis, structure, summary: counts, dominant };
}
