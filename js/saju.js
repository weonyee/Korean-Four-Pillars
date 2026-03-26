/**
 * saju.js — Pure Saju (四柱) calculation logic.
 * No DOM dependencies. All functions are stateless and exportable.
 */

export const HEAVENLY_STEMS   = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

export const STEM_ELEMENTS   = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
export const BRANCH_ELEMENTS = ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];

/** Maps zodiac animal name → earthly branch index (子=0 … 亥=11) */
export const ZODIAC_BRANCH_INDEX = {
  RAT:0, OX:1, TIGER:2, RABBIT:3, DRAGON:4, SNAKE:5,
  HORSE:6, SHEEP:7, MONKEY:8, ROOSTER:9, DOG:10, PIG:11,
};

export const ZODIAC_EMOJIS = {
  RAT:'🐀', OX:'🐂', TIGER:'🐅', RABBIT:'🐇', DRAGON:'🐉', SNAKE:'🐍',
  HORSE:'🐎', SHEEP:'🐑', MONKEY:'🐒', ROOSTER:'🐓', DOG:'🐕', PIG:'🐖',
};

export const ELEMENT_DESCRIPTIONS = {
  Wood:  'Growth and creativity flow through your chart. You are adaptable, compassionate, and driven by vision.',
  Fire:  'Passion and brilliance define your path. Your chart radiates charisma, ambition, and transformative energy.',
  Earth: 'Stability and wisdom anchor your destiny. You are reliable, nurturing, and deeply connected to the material world.',
  Metal: 'Precision and strength shape your journey. Your chart speaks of discipline, justice, and unwavering resolve.',
  Water: 'Intuition and depth guide your fate. You are perceptive, fluid, and carry the wisdom of hidden currents.',
};

/** Element → kanji character for display */
export const ELEMENT_KANJI = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};

/** Element → accent color class */
export const ELEMENT_COLOR = {
  Wood:  'bg-[#2d6a4f]',
  Fire:  'bg-[#ba1a1a]',
  Earth: 'bg-[#775a19]',
  Metal: 'bg-[#474747]',
  Water: 'bg-[#171818]',
};

export const ELEMENT_DETAIL = {
  Wood: {
    quote: '"Like bamboo in the wind — flexible in form, unbroken in spirit."',
    temperament: 'Creative / Empathetic',
    wealth: 'Steady Growth',
    missing: 'Metal (Balance)',
    body: `Your chart is shaped by the Wood element's upward momentum. You possess a natural gift for growth — in relationships, ideas, and endeavors. The Wood energy makes you a visionary who sees potential where others see obstacles. However, without sufficient Metal to prune and focus, your energy can scatter across too many directions at once. Cultivate discipline as your greatest ally.`,
    social: 'You attract those born under Water elements. They nourish your roots, while you give them direction and purpose.',
    health: 'Pay attention to liver and eye health. Wood imbalances often surface as tension headaches or vision fatigue during high-stress periods.',
  },
  Fire: {
    quote: '"The torch that lights a thousand candles loses nothing of its own flame."',
    temperament: 'Passionate / Charismatic',
    wealth: 'High Potential',
    missing: 'Water (Wisdom)',
    body: `Your chart burns with the brilliance of Fire — a force that illuminates, transforms, and inspires. You are drawn to leadership and naturally command attention in any room. The challenge lies in sustaining the flame: Fire without Water risks burning too bright and too fast. Periods of rest and reflection are not weakness — they are the breath that keeps your fire alive through all seasons.`,
    social: 'Wood element individuals are your greatest allies. They fuel your ambitions and share your enthusiasm for bold action.',
    health: 'Monitor cardiovascular health and sleep quality. Fire imbalances often manifest as anxiety or restlessness during transitional seasons.',
  },
  Earth: {
    quote: '"A mountain that commands the clouds, yet welcomes the spring rain."',
    temperament: 'Steadfast / Stoic',
    wealth: 'Moderate Potential',
    missing: 'Wood (Vitality)',
    body: `Your life path is characterized by a "Dry Mountain" that requires the balancing force of Water to become fertile. While you possess immense internal stability and a reliable nature, your chart suggests a period of early struggle that transforms into significant late-life authority. Opportunities often come through social connections rather than raw effort. Beware of rigidity — like a mountain that refuses to shift, you may miss fleeting opportunities if too resistant to change.`,
    social: 'You naturally attract those born under Wood elements. They find safety in your presence, while you find vitality in theirs.',
    health: 'Monitor digestive health and circulation. Earth imbalances often manifest in metabolic slow-downs during autumn months.',
  },
  Metal: {
    quote: '"The sword is sharpened not by softness, but by the patient grinding of stone."',
    temperament: 'Disciplined / Just',
    wealth: 'Structured Gains',
    missing: 'Fire (Passion)',
    body: `Metal defines your chart with precision and an unwavering sense of right and wrong. You are the architect of systems — someone who brings order to chaos and clarity to confusion. Your greatest strength is your integrity; your greatest challenge is learning that not everything can be optimized. Allow yourself the freedom to be imperfect, and you will discover a warmth within the steel that draws others to you deeply.`,
    social: 'Earth element individuals provide the foundation you need. Their stability complements your precision and shared values.',
    health: 'Pay attention to respiratory health and skin. Metal imbalances often appear as dryness or tension in the lungs during winter.',
  },
  Water: {
    quote: '"Still waters run deep — and it is in the depths that true wisdom is found."',
    temperament: 'Intuitive / Perceptive',
    wealth: 'Hidden Treasure',
    missing: 'Earth (Grounding)',
    body: `Water flows through your chart as the element of deep knowing. You perceive what others cannot see and feel what others cannot name. This gift of intuition makes you an exceptional advisor, healer, or creative. The risk is in formlessness — Water without Earth has no banks to give it direction. Seek structure and routine not as constraints, but as the riverbed that gives your depth a meaningful course.`,
    social: 'Metal element individuals are your natural partners. Their clarity and structure give your intuition a powerful channel to flow through.',
    health: 'Monitor kidney and joint health. Water imbalances often surface as fatigue or lower back discomfort during cold months.',
  },
};

/** Generate a simplified 5-cycle luck flow based on birth year */
export function getLuckCycles(birthYear) {
  const base = birthYear % 5;
  const cycles = [
    { label: 'Foundation', intensity: 0.5 },
    { label: 'Challenge',  intensity: 0.65 },
    { label: 'Peak Fortune', intensity: 1, peak: true },
    { label: 'Stability', intensity: 0.75 },
    { label: 'Abundance', intensity: 0.8 },
  ];
  return cycles.map((c, i) => ({
    ...c,
    ageRange: `Age ${15 + (i + base) % 5 * 10}–${24 + (i + base) % 5 * 10}`,
  }));
}

// ── Pillar calculators ────────────────────────────────────────────────────────

/** @param {number} year — Gregorian year */
export function getYearPillar(year) {
  const stemIdx   = ((year - 4) % 10 + 10) % 10;
  const branchIdx = ((year - 4) % 12 + 12) % 12;
  return _pillar(stemIdx, branchIdx);
}

/** @param {number} year @param {number} month — 1-based */
export function getMonthPillar(year, month) {
  const branchIdx = (month + 1) % 12;
  const stemBase  = ((year - 4) % 5) * 2;
  const stemIdx   = ((stemBase + month - 1) % 10 + 10) % 10;
  return _pillar(stemIdx, branchIdx);
}

/** @param {Date} date */
export function getDayPillar(date) {
  const { y, m, d } = { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
  const jdn = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4)
    + Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12)
    - Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4)
    + d - 32075;
  const stemIdx   = ((jdn + 9) % 10 + 10) % 10;
  const branchIdx = ((jdn + 1) % 12 + 12) % 12;
  return _pillar(stemIdx, branchIdx);
}

/**
 * @param {string} zodiac — e.g. 'RAT'
 * @param {string} dayStem — heavenly stem character of the day pillar
 */
export function getHourPillar(zodiac, dayStem) {
  const branchIdx = ZODIAC_BRANCH_INDEX[zodiac] ?? 0;
  const dayStemIdx = HEAVENLY_STEMS.indexOf(dayStem);
  const stemBase  = (dayStemIdx % 5) * 2;
  const stemIdx   = ((stemBase + branchIdx) % 10 + 10) % 10;
  return _pillar(stemIdx, branchIdx);
}

/**
 * Compute all four pillars from user input.
 * @param {{ birthDate: string, zodiac: string }} input
 * @returns {{ year, month, day, hour }}
 */
export function computeFourPillars({ birthDate, zodiac }) {
  const date  = new Date(birthDate + 'T12:00:00');
  const year  = getYearPillar(date.getFullYear());
  const month = getMonthPillar(date.getFullYear(), date.getMonth() + 1);
  const day   = getDayPillar(date);
  const hour  = getHourPillar(zodiac, day.stem);
  return { year, month, day, hour };
}

/**
 * Returns the dominant element across all four pillars.
 * @param {{ year, month, day, hour }} pillars
 * @returns {string}
 */
export function getDominantElement(pillars) {
  const counts = {};
  Object.values(pillars).forEach(p => {
    counts[p.element] = (counts[p.element] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Internal helper ───────────────────────────────────────────────────────────

function _pillar(stemIdx, branchIdx) {
  return {
    stem:    HEAVENLY_STEMS[stemIdx],
    branch:  EARTHLY_BRANCHES[branchIdx],
    element: STEM_ELEMENTS[stemIdx],
  };
}
