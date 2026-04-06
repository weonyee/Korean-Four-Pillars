/**
 * yongsin.js — 용신(用神) 선정 모듈.
 * No DOM dependencies. All functions are stateless and exportable.
 *
 * 일간 강약 판단 → 용신(필요한 오행) 선정
 * fortuneteller MCP (hjsh200219/fortuneteller) 참고.
 */

import { HEAVENLY_STEMS, STEM_ELEMENTS, BRANCH_ELEMENTS } from './saju.js';
import { BRANCH_HIDDEN_STEMS } from './sipsin.js';

// ── 오행 관계 ────────────────────────────────────────────────────────────────

const GENERATES = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
const CONTROLS  = { Wood:'Earth', Fire:'Metal', Earth:'Water', Metal:'Wood', Water:'Fire' };
const GENERATED_BY = { Fire:'Wood', Earth:'Fire', Metal:'Earth', Water:'Metal', Wood:'Water' };
const CONTROLLED_BY = { Earth:'Wood', Metal:'Fire', Water:'Earth', Wood:'Metal', Fire:'Water' };

// ── 월령 강약 판단 ──────────────────────────────────────────────────────────
// 일간 오행이 월지에서 강한지 약한지 판단
// 왕(旺): 같은 오행, 상(相): 나를 생하는 오행

const MONTHLY_STRENGTH = {
  // 월지 오행 → 일간 오행별 강도
  // '월지오행': { '일간오행': 'strong' | 'medium' | 'weak' }
};

/**
 * 월령(月令)에서의 일간 강도를 판단합니다.
 * @param {string} dayStemElement — 일간 오행
 * @param {string} monthBranchElement — 월지 오행
 * @returns {'strong' | 'medium' | 'weak'}
 */
function getMonthlyStrength(dayStemElement, monthBranchElement) {
  if (dayStemElement === monthBranchElement) return 'strong';          // 같은 오행 → 왕
  if (GENERATED_BY[dayStemElement] === monthBranchElement) return 'strong';  // 생해주는 오행 → 상
  if (GENERATES[dayStemElement] === monthBranchElement) return 'weak';       // 설기
  if (CONTROLS[dayStemElement] === monthBranchElement) return 'weak';        // 극출
  return 'medium';
}

// ── 일간 강약 점수 계산 ─────────────────────────────────────────────────────

/**
 * 일간 강약을 점수로 계산합니다.
 *
 * 배점 (100점 만점):
 *   월령 강도: 40%
 *   비겁(같은 오행) 수: 25%
 *   인성(나를 생하는 오행) 수: 20%
 *   설기(내가 생/극하는 오행) 감점: -15%
 *
 * @param {{ year, month, day, hour }} pillars
 * @returns {{ score, level, dayElement }}
 */
export function calculateDayMasterStrength(pillars) {
  const dayStemIdx = HEAVENLY_STEMS.indexOf(pillars.day.stem);
  const dayElement = STEM_ELEMENTS[dayStemIdx];
  const monthBranchEl = BRANCH_ELEMENTS[['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(pillars.month.branch)];

  let score = 50; // 기본 점수

  // 1. 월령 강도 (40점)
  const monthStrength = getMonthlyStrength(dayElement, monthBranchEl);
  if (monthStrength === 'strong') score += 40;
  else if (monthStrength === 'medium') score += 20;
  else score -= 20;

  // 2. 비겁 카운트 (25점) — 같은 오행 천간/지지
  let bigeop = 0;
  let inseong = 0;
  let seolgi = 0;

  for (const pos of ['year', 'month', 'hour']) {
    const stemEl = STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(pillars[pos].stem)];
    if (stemEl === dayElement) bigeop++;
    if (stemEl === GENERATED_BY[dayElement]) inseong++;
    if (stemEl === GENERATES[dayElement] || stemEl === CONTROLS[dayElement]) seolgi++;
  }

  // 지지 본기도 카운트
  for (const pos of ['year', 'month', 'day', 'hour']) {
    const branch = pillars[pos].branch;
    const hidden = BRANCH_HIDDEN_STEMS[branch];
    if (hidden && hidden.length > 0) {
      const mainEl = STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(hidden[0])];
      if (mainEl === dayElement) bigeop++;
      if (mainEl === GENERATED_BY[dayElement]) inseong++;
      if (mainEl === GENERATES[dayElement] || mainEl === CONTROLS[dayElement]) seolgi++;
    }
  }

  if (bigeop >= 4) score += 25;
  else if (bigeop >= 2) score += 15;
  else if (bigeop >= 1) score += 5;
  else score -= 10;

  // 3. 인성 카운트 (20점)
  if (inseong >= 3) score += 20;
  else if (inseong >= 2) score += 15;
  else if (inseong >= 1) score += 5;

  // 4. 설기 감점 (-15점)
  if (seolgi >= 6) score -= 15;
  else if (seolgi >= 4) score -= 5;

  score = Math.max(0, Math.min(100, score));

  let level;
  if (score >= 80) level = 'very_strong';
  else if (score >= 65) level = 'strong';
  else if (score >= 40) level = 'medium';
  else if (score >= 25) level = 'weak';
  else level = 'very_weak';

  return { score, level, dayElement };
}

// ── 용신 선정 ───────────────────────────────────────────────────────────────

/**
 * 용신(用神)과 기신(忌神)을 선정합니다.
 *
 * 신강(身強): 설기시켜야 → 식상/재성이 용신
 * 신약(身弱): 보강해야 → 인성/비겁이 용신
 *
 * @param {{ year, month, day, hour }} pillars
 * @returns {{ yongsin, gisin, strength, recommendation }}
 */
export function selectYongSin(pillars) {
  const { score, level, dayElement } = calculateDayMasterStrength(pillars);

  let primary, secondary, gisin1, gisin2;

  if (level === 'very_strong' || level === 'strong') {
    // 신강 → 빼주는 오행 필요
    primary = GENERATES[dayElement];    // 식상 (내가 생하는 것)
    secondary = CONTROLS[dayElement];   // 재성 (내가 극하는 것)
    gisin1 = GENERATED_BY[dayElement];  // 인성 (기신)
    gisin2 = dayElement;                // 비겁 (기신)
  } else if (level === 'weak' || level === 'very_weak') {
    // 신약 → 보강하는 오행 필요
    primary = GENERATED_BY[dayElement]; // 인성 (나를 생하는 것)
    secondary = dayElement;             // 비겁 (같은 오행)
    gisin1 = CONTROLS[dayElement];      // 재성 (기신)
    gisin2 = CONTROLLED_BY[dayElement]; // 관성 (기신)
  } else {
    // 중화 → 가장 약한 오행을 보충
    const elementCounts = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
    for (const pos of ['year', 'month', 'day', 'hour']) {
      elementCounts[STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(pillars[pos].stem)]]++;
      const bIdx = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(pillars[pos].branch);
      elementCounts[BRANCH_ELEMENTS[bIdx]]++;
    }
    const sorted = Object.entries(elementCounts).sort((a, b) => a[1] - b[1]);
    primary = sorted[0][0];
    secondary = sorted[1][0];
    gisin1 = sorted[4][0];
    gisin2 = sorted[3][0];
  }

  // 용신 속성
  const ELEMENT_ATTRS = {
    Wood:  { colors: ['녹색', '청색'], direction: '동쪽', careers: ['교육', '출판', '가구', '원예', '패션'] },
    Fire:  { colors: ['빨간색', '주황색', '보라색'], direction: '남쪽', careers: ['요리', '전기', '광고', '방송', '예술', 'IT'] },
    Earth: { colors: ['노란색', '갈색', '베이지'], direction: '중앙', careers: ['부동산', '건설', '농업', '금융', '중개'] },
    Metal: { colors: ['흰색', '금색', '은색'], direction: '서쪽', careers: ['금융', '기계', '의료', '법률', '군인'] },
    Water: { colors: ['검정', '파란색', '남색'], direction: '북쪽', careers: ['무역', '유통', '수산', '관광', '연구'] },
  };

  return {
    strength: { score, level, dayElement },
    yongsin: {
      primary, secondary,
      attrs: ELEMENT_ATTRS[primary],
    },
    gisin: { primary: gisin1, secondary: gisin2 },
  };
}
