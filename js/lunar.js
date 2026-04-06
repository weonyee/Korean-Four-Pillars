/**
 * lunar.js — 절기(節氣) 기반 사주 연/월 경계 계산.
 *
 * 한국 사주에서는:
 *   - 년주(年柱): 입춘(立春, 태양황경 315°)에 바뀜
 *   - 월주(月柱): 12절기(節氣)마다 바뀜
 *
 * 태양 황경(ecliptic longitude)을 근사 계산하여
 * 각 절기의 정확한 날짜를 산출합니다.
 */

// ── 12절기 (節, Jie) — 월주 경계를 결정하는 태양 황경 ─────────────────────────
// [황경(°), 사주 월 번호(인월=1), 이름]
const SOLAR_TERMS = [
  { longitude: 315, month: 1,  name: '입춘' },  // ~Feb 4   寅月
  { longitude: 345, month: 2,  name: '경칩' },  // ~Mar 6   卯月
  { longitude:  15, month: 3,  name: '청명' },  // ~Apr 5   辰月
  { longitude:  45, month: 4,  name: '입하' },  // ~May 6   巳月
  { longitude:  75, month: 5,  name: '망종' },  // ~Jun 6   午月
  { longitude: 105, month: 6,  name: '소서' },  // ~Jul 7   未月
  { longitude: 135, month: 7,  name: '입추' },  // ~Aug 8   申月
  { longitude: 165, month: 8,  name: '백로' },  // ~Sep 8   酉月
  { longitude: 195, month: 9,  name: '한로' },  // ~Oct 8   戌月
  { longitude: 225, month: 10, name: '입동' },  // ~Nov 7   亥月
  { longitude: 255, month: 11, name: '대설' },  // ~Dec 7   子月
  { longitude: 285, month: 12, name: '소한' },  // ~Jan 6   丑月
];

// ── 태양 황경 근사 계산 (Jean Meeus, "Astronomical Algorithms") ──────────────

const DEG = Math.PI / 180;

/** Gregorian Date → Julian Day Number */
function dateToJD(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate() + (date.getHours() + date.getMinutes() / 60) / 24;

  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;

  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** Julian Day Number → Gregorian Date */
function jdToDate(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  const a = z < 2299161 ? z : (() => {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    return z + 1 + alpha - Math.floor(alpha / 4);
  })();
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day   = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year  = month > 2 ? c - 4716 : c - 4715;

  const hours   = f * 24;
  const h       = Math.floor(hours);
  const minutes = Math.round((hours - h) * 60);

  return new Date(year, month - 1, day, h, minutes);
}

/**
 * 태양 황경 (도, 0–360) at given Julian Day.
 * VSOP87 주요 섭동항 포함으로 ±0.01° 정밀도 (날짜 기준 ±몇 시간 이내).
 */
function solarLongitude(jd) {
  const T  = (jd - 2451545.0) / 36525.0;
  const T2 = T * T;
  const T3 = T2 * T;

  // Mean longitude (deg)
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;

  // Mean anomaly of Sun (deg)
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
  const Mrad = M * DEG;

  // Mean anomaly of Moon (deg)
  const Mm = 134.963 + 477198.8676 * T;
  const Mmrad = Mm * DEG;

  // Argument of latitude of Moon
  const F = 93.272 + 483202.0175 * T;
  const Frad = F * DEG;

  // Longitude of ascending node of Moon
  const omega = 125.04 - 1934.136 * T;
  const omegaRad = omega * DEG;

  // Equation of center (Sun)
  const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunLon = L0 + C;

  // Nutation in longitude (simplified)
  const nutLon = -17.20 / 3600 * Math.sin(omegaRad)
    - 1.32 / 3600 * Math.sin(2 * sunLon * DEG)
    - 0.23 / 3600 * Math.sin(2 * Mmrad)
    + 0.21 / 3600 * Math.sin(2 * omegaRad);

  // Aberration
  const aberration = -20.4898 / 3600 / (1.000001018 * (1 - 0.016708634 * Math.cos(Mrad)));

  const apparent = sunLon + nutLon + aberration;

  return ((apparent % 360) + 360) % 360;
}

/**
 * 태양이 특정 황경(targetLng)에 도달하는 JD를 이분법(bisection)으로 구합니다.
 */
function findSolarTermJD(targetLng, jdStart, jdEnd) {
  const diff = (a, b) => {
    let d = a - b;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };

  let lo = jdStart;
  let hi = jdEnd;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const lng = solarLongitude(mid);
    if (diff(lng, targetLng) < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * 주어진 연도의 특정 절기 날짜를 반환합니다.
 * @param {number} year — Gregorian year
 * @param {number} termIndex — SOLAR_TERMS 배열 인덱스 (0=입춘, 11=소한)
 * @returns {Date}
 */
export function getSolarTermDate(year, termIndex) {
  const term = SOLAR_TERMS[termIndex];

  // 탐색 범위: 해당 절기의 대략적 시점 ±30일
  const approxMonth = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1][termIndex];
  const approxYear  = termIndex === 11 ? year + 1 : year; // 소한은 다음해 1월
  const approxDate  = new Date(approxYear, approxMonth - 1, 1, 12);
  const jdCenter    = dateToJD(approxDate);

  const jd = findSolarTermJD(term.longitude, jdCenter - 30, jdCenter + 30);
  return jdToDate(jd);
}

/**
 * 양력 날짜 → 사주용 연도 (입춘 기준).
 * 입춘 이전이면 전년도를 반환합니다.
 * @param {Date} date
 * @returns {number}
 */
export function getSajuYear(date) {
  const year = date.getFullYear();
  const ipchun = getSolarTermDate(year, 0);
  return date < ipchun ? year - 1 : year;
}

/**
 * 양력 날짜 → 사주용 월 번호 (1–12, 인월=1).
 * 절기 경계 기준으로 판단합니다.
 *
 * 전년도 대설·소한부터 금년 모든 절기를 시간순 나열 후
 * 해당 날짜가 속하는 구간을 찾습니다.
 * @param {Date} date
 * @returns {number}
 */
export function getSajuMonth(date) {
  const year = date.getFullYear();

  // 전년도 대설(11월)·소한(12월) + 금년 12절기를 시간순으로 수집
  const entries = [
    { d: getSolarTermDate(year - 1, 10), month: 11 }, // 전년 대설 (~12월)
    { d: getSolarTermDate(year - 1, 11), month: 12 }, // 전년 소한 (~1월)
  ];
  for (let i = 0; i < 12; i++) {
    entries.push({ d: getSolarTermDate(year, i), month: SOLAR_TERMS[i].month });
  }
  entries.sort((a, b) => a.d - b.d);

  // 해당 날짜 이전의 마지막 절기가 현재 월
  let result = entries[0].month;
  for (const entry of entries) {
    if (date >= entry.d) {
      result = entry.month;
    } else {
      break;
    }
  }
  return result;
}

/**
 * 주어진 날짜 이후 가장 가까운 절기 날짜를 반환합니다.
 * @param {Date} date
 * @returns {Date|null}
 */
export function getNextSolarTermDate(date) {
  const year = date.getFullYear();
  let closest = null;
  // 올해 + 내년 절기에서 date 이후 첫 번째를 찾음
  for (const y of [year, year + 1]) {
    for (let i = 0; i < 12; i++) {
      const d = getSolarTermDate(y, i);
      if (d > date && (!closest || d < closest)) {
        closest = d;
      }
    }
  }
  return closest;
}

/**
 * 주어진 날짜 이전 가장 가까운 절기 날짜를 반환합니다.
 * @param {Date} date
 * @returns {Date|null}
 */
export function getPrevSolarTermDate(date) {
  const year = date.getFullYear();
  let closest = null;
  // 올해 + 전년 절기에서 date 이전 마지막을 찾음
  for (const y of [year - 1, year]) {
    for (let i = 0; i < 12; i++) {
      const d = getSolarTermDate(y, i);
      if (d < date && (!closest || d > closest)) {
        closest = d;
      }
    }
  }
  return closest;
}

export { SOLAR_TERMS };
