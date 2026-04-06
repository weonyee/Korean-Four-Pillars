/**
 * sinsal.js — 신살(神殺) detection logic.
 * No DOM dependencies. All functions are stateless and exportable.
 *
 * fortuneteller MCP (hjsh200219/fortuneteller) 참고하여 구현.
 * 16종 신살: 길신 6종 + 중성 2종 + 흉신 8종
 */

import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from './saju.js';

// ── 천을귀인(天乙貴人) 판단표 ───────────────────────────────────────────────
// 일간 → 귀인이 되는 지지 2개
const CHEONUL_TABLE = {
  '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

// ── 천덕귀인(天德貴人) ──────────────────────────────────────────────────────
// 월지 → 천덕이 되는 천간
const CHEONDUK_TABLE = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
  '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
  '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};

// ── 월덕귀인(月德貴人) ──────────────────────────────────────────────────────
// 월지 → 월덕이 되는 천간
const WOLDUK_TABLE = {
  '寅': '丙', '午': '丙', '戌': '丙',
  '申': '壬', '子': '壬', '辰': '壬',
  '亥': '甲', '卯': '甲', '未': '甲',
  '巳': '庚', '酉': '庚', '丑': '庚',
};

// ── 문창귀인(文昌貴人) ──────────────────────────────────────────────────────
// 일간 → 문창이 되는 지지
const MUNCHANG_TABLE = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉',
  '戊': '申', '己': '酉', '庚': '亥', '辛': '子',
  '壬': '寅', '癸': '卯',
};

// ── 학당귀인(學堂貴人) ──────────────────────────────────────────────────────
// 일간 → 학당이 되는 지지
const HAKDANG_TABLE = {
  '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
  '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
  '壬': '申', '癸': '卯',
};

// ── 금여록(金輿祿) ─────────────────────────────────────────────────────────
// 일간 → 금여가 되는 지지
const GEUMYEO_TABLE = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申',
  '戊': '未', '己': '申', '庚': '戌', '辛': '亥',
  '壬': '丑', '癸': '寅',
};

// ── 도화살(桃花殺) ──────────────────────────────────────────────────────────
// 일지/년지 기준 삼합 → 도화 지지
const DOHWA_TABLE = {
  '寅': '卯', '午': '卯', '戌': '卯',  // 인오술 → 묘
  '申': '酉', '子': '酉', '辰': '酉',  // 신자진 → 유
  '巳': '午', '酉': '午', '丑': '午',  // 사유축 → 오
  '亥': '子', '卯': '子', '未': '子',  // 해묘미 → 자
};

// ── 역마살(驛馬殺) ──────────────────────────────────────────────────────────
const YEOKMA_TABLE = {
  '寅': '申', '午': '申', '戌': '申',
  '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
};

// ── 화개살(華蓋殺) ──────────────────────────────────────────────────────────
const HWAGAE_TABLE = {
  '寅': '戌', '午': '戌', '戌': '戌',
  '申': '辰', '子': '辰', '辰': '辰',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '亥': '未', '卯': '未', '未': '未',
};

// ── 양인살(羊刃殺) ──────────────────────────────────────────────────────────
// 일간 → 양인이 되는 지지
const YANGIN_TABLE = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳',
  '戊': '午', '己': '巳', '庚': '酉', '辛': '申',
  '壬': '子', '癸': '亥',
};

// ── 백호살(白虎殺) ──────────────────────────────────────────────────────────
// 일지 기준
const BAEKHO_TABLE = {
  '甲': '辰', '乙': '巳', '丙': '午', '丁': '未',
  '戊': '午', '己': '未', '庚': '戌', '辛': '亥',
  '壬': '寅', '癸': '卯',
};

// ── 공망(空亡) ──────────────────────────────────────────────────────────────
// 일간지 기준 순(旬) → 공망 지지 2개
const GONGMANG_GROUPS = [
  { stems: ['甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉'], empty: ['戌','亥'] },
  { stems: ['甲戌','乙亥','丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未'], empty: ['申','酉'] },
  { stems: ['甲申','乙酉','丙戌','丁亥','戊子','己丑','庚寅','辛卯','壬辰','癸巳'], empty: ['午','未'] },
  { stems: ['甲午','乙未','丙申','丁酉','戊戌','己亥','庚子','辛丑','壬寅','癸卯'], empty: ['辰','巳'] },
  { stems: ['甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥','壬子','癸丑'], empty: ['寅','卯'] },
  { stems: ['甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥'], empty: ['子','丑'] },
];

// ── 원진살(怨嗔殺) ──────────────────────────────────────────────────────────
const WONJIN_PAIRS = [
  ['子','未'], ['丑','午'], ['寅','酉'], ['卯','申'], ['辰','亥'], ['巳','戌'],
];

// ── 귀문관살(鬼門關殺) ──────────────────────────────────────────────────────
const GWIMUN_PAIRS = [
  ['子','酉'], ['丑','寅'], ['午','卯'], ['未','申'], ['辰','巳'], ['戌','亥'],
];

// ══════════════════════════════════════════════════════════════════════════════

/**
 * 사주 4주에서 모든 지지를 추출합니다.
 */
function getAllBranches(pillars) {
  return [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];
}

function getAllStems(pillars) {
  return [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
}

/**
 * 공망 지지를 구합니다.
 * @param {object} dayPillar — { stem, branch }
 * @returns {string[]} 공망 지지 2개
 */
export function getGongMang(dayPillar) {
  const dayGanZhi = dayPillar.stem + dayPillar.branch;
  for (const group of GONGMANG_GROUPS) {
    if (group.stems.includes(dayGanZhi)) return group.empty;
  }
  return [];
}

/**
 * 사주 전체의 신살을 분석합니다.
 *
 * @param {{ year, month, day, hour }} pillars — computeFourPillars() 결과
 * @returns {{ name, type, found, positions }[]}
 */
export function analyzeSinSal(pillars) {
  const dayStem = pillars.day.stem;
  const dayBranch = pillars.day.branch;
  const yearBranch = pillars.year.branch;
  const monthBranch = pillars.month.branch;
  const branches = getAllBranches(pillars);
  const stems = getAllStems(pillars);
  const results = [];

  // ── 길신 (Lucky) ──────────────────────────────────────────────────────

  // 천을귀인
  const cheonul = CHEONUL_TABLE[dayStem] || [];
  const cheonulPos = branches.filter(b => cheonul.includes(b));
  if (cheonulPos.length > 0) {
    results.push({ name: '천을귀인', hanja: '天乙貴人', type: 'lucky', positions: cheonulPos });
  }

  // 천덕귀인
  const cheonduk = CHEONDUK_TABLE[monthBranch];
  if (cheonduk && stems.includes(cheonduk)) {
    results.push({ name: '천덕귀인', hanja: '天德貴人', type: 'lucky', positions: [cheonduk] });
  }

  // 월덕귀인
  const wolduk = WOLDUK_TABLE[monthBranch];
  if (wolduk && stems.includes(wolduk)) {
    results.push({ name: '월덕귀인', hanja: '月德貴人', type: 'lucky', positions: [wolduk] });
  }

  // 문창귀인
  const munchang = MUNCHANG_TABLE[dayStem];
  if (munchang && branches.includes(munchang)) {
    results.push({ name: '문창귀인', hanja: '文昌貴人', type: 'lucky', positions: [munchang] });
  }

  // 학당귀인
  const hakdang = HAKDANG_TABLE[dayStem];
  if (hakdang && branches.includes(hakdang)) {
    results.push({ name: '학당귀인', hanja: '學堂貴人', type: 'lucky', positions: [hakdang] });
  }

  // 금여록
  const geumyeo = GEUMYEO_TABLE[dayStem];
  if (geumyeo && branches.includes(geumyeo)) {
    results.push({ name: '금여록', hanja: '金輿祿', type: 'lucky', positions: [geumyeo] });
  }

  // ── 중성 (Neutral) ────────────────────────────────────────────────────

  // 역마살
  const yeokma = YEOKMA_TABLE[dayBranch] || YEOKMA_TABLE[yearBranch];
  if (yeokma && branches.includes(yeokma)) {
    results.push({ name: '역마살', hanja: '驛馬殺', type: 'neutral', positions: [yeokma] });
  }

  // 화개살
  const hwagae = HWAGAE_TABLE[dayBranch] || HWAGAE_TABLE[yearBranch];
  if (hwagae && branches.includes(hwagae)) {
    results.push({ name: '화개살', hanja: '華蓋殺', type: 'neutral', positions: [hwagae] });
  }

  // ── 흉신 (Unlucky) ────────────────────────────────────────────────────

  // 도화살
  const dohwa = DOHWA_TABLE[dayBranch] || DOHWA_TABLE[yearBranch];
  if (dohwa && branches.includes(dohwa)) {
    results.push({ name: '도화살', hanja: '桃花殺', type: 'unlucky', positions: [dohwa] });
  }

  // 양인살
  const yangin = YANGIN_TABLE[dayStem];
  if (yangin && branches.includes(yangin)) {
    results.push({ name: '양인살', hanja: '羊刃殺', type: 'unlucky', positions: [yangin] });
  }

  // 백호살
  const baekho = BAEKHO_TABLE[dayStem];
  if (baekho && branches.includes(baekho)) {
    results.push({ name: '백호살', hanja: '白虎殺', type: 'unlucky', positions: [baekho] });
  }

  // 공망
  const gongmang = getGongMang(pillars.day);
  const gongmangPos = branches.filter(b => gongmang.includes(b));
  if (gongmangPos.length > 0) {
    results.push({ name: '공망', hanja: '空亡', type: 'unlucky', positions: gongmangPos });
  }

  // 원진살
  for (const pair of WONJIN_PAIRS) {
    if (branches.includes(pair[0]) && branches.includes(pair[1])) {
      results.push({ name: '원진살', hanja: '怨嗔殺', type: 'unlucky', positions: pair });
      break;
    }
  }

  // 귀문관살
  for (const pair of GWIMUN_PAIRS) {
    if (branches.includes(pair[0]) && branches.includes(pair[1])) {
      results.push({ name: '귀문관살', hanja: '鬼門關殺', type: 'unlucky', positions: pair });
      break;
    }
  }

  // 고숙살 (孤宿殺) — 비견/겁재 없고, 정재/정관도 없으면
  // (simplified: 사주에 일간과 같은 오행이 일간 외에 없으면)
  const dayStemIdx = HEAVENLY_STEMS.indexOf(dayStem);
  const dayElement = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'][dayStemIdx];
  const sameElementCount = stems.filter((s, i) => {
    if (i === 2) return false; // 일간 제외
    const idx = HEAVENLY_STEMS.indexOf(s);
    return ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'][idx] === dayElement;
  }).length;
  if (sameElementCount === 0) {
    results.push({ name: '고숙살', hanja: '孤宿殺', type: 'unlucky', positions: [] });
  }

  return results;
}
