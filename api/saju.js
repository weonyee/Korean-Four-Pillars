/**
 * api/saju.js — Saju calculation logic for the API server (CommonJS).
 * Mirrors js/saju.js. When upgrading to a monorepo/bundler, unify these.
 */

const HEAVENLY_STEMS   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const STEM_ELEMENTS    = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];

const ZODIAC_BRANCH_INDEX = {
  RAT:0, OX:1, TIGER:2, RABBIT:3, DRAGON:4, SNAKE:5,
  HORSE:6, SHEEP:7, MONKEY:8, ROOSTER:9, DOG:10, PIG:11,
};

const ELEMENT_DETAIL = {
  Wood:  { temperament:'Creative / Empathetic', wealth:'Steady Growth',    missing:'Metal (Balance)',  description:'Growth and creativity flow through your chart. You are adaptable, compassionate, and driven by vision.' },
  Fire:  { temperament:'Passionate / Charismatic', wealth:'High Potential', missing:'Water (Wisdom)',  description:'Passion and brilliance define your path. Your chart radiates charisma, ambition, and transformative energy.' },
  Earth: { temperament:'Steadfast / Stoic',      wealth:'Moderate Potential', missing:'Wood (Vitality)', description:'Stability and wisdom anchor your destiny. You are reliable, nurturing, and deeply connected to the material world.' },
  Metal: { temperament:'Disciplined / Just',     wealth:'Structured Gains', missing:'Fire (Passion)',  description:'Precision and strength shape your journey. Your chart speaks of discipline, justice, and unwavering resolve.' },
  Water: { temperament:'Intuitive / Perceptive', wealth:'Hidden Treasure',  missing:'Earth (Grounding)', description:'Intuition and depth guide your fate. You are perceptive, fluid, and carry the wisdom of hidden currents.' },
};

// ── Pillar calculators ────────────────────────────────────────────────────────

function getYearPillar(year) {
  const stemIdx   = ((year - 4) % 10 + 10) % 10;
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  return _pillar(stemIdx, branchIdx);
}

function getMonthPillar(year, month) {
  const branchIdx = (month + 1) % 12;
  const stemBase  = ((year - 4) % 5) * 2;
  const stemIdx   = ((stemBase + month - 1) % 10 + 10) % 10;
  return _pillar(stemIdx, branchIdx);
}

function getDayPillar(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jdn = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4)
    + Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12)
    - Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4)
    + d - 32075;
  return _pillar(((jdn + 9) % 10 + 10) % 10, ((jdn + 1) % 12 + 12) % 12);
}

function getHourPillar(zodiac, dayStem) {
  const branchIdx  = ZODIAC_BRANCH_INDEX[zodiac] ?? 0;
  const dayStemIdx = HEAVENLY_STEMS.indexOf(dayStem);
  const stemIdx    = (((dayStemIdx % 5) * 2 + branchIdx) % 10 + 10) % 10;
  return _pillar(stemIdx, branchIdx);
}

function _pillar(stemIdx, branchIdx) {
  return {
    stem:    HEAVENLY_STEMS[stemIdx],
    branch:  EARTHLY_BRANCHES[branchIdx],
    element: STEM_ELEMENTS[stemIdx],
  };
}

function getDominantElement(pillars) {
  const counts = {};
  Object.values(pillars).forEach(p => { counts[p.element] = (counts[p.element] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute a full Saju reading from raw input.
 * @param {{ birthDate: string, zodiac: string, gender: string, city: string }} input
 * @returns {object} reading
 */
function computeReading({ birthDate, zodiac, gender, city }) {
  const date    = new Date(birthDate + 'T12:00:00');
  const pillars = {
    year:  getYearPillar(date.getFullYear()),
    month: getMonthPillar(date.getFullYear(), date.getMonth() + 1),
    day:   getDayPillar(date),
    hour:  getHourPillar(zodiac, getDayPillar(date).stem),
  };
  const dominant = getDominantElement(pillars);
  const detail   = ELEMENT_DETAIL[dominant];

  return {
    input: { birthDate, zodiac, gender, city },
    pillars,
    dominant,
    detail,
  };
}

module.exports = { computeReading };
