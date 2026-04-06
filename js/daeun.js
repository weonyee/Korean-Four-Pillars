/**
 * daeun.js — 대운(大運) 계산 모듈.
 * No DOM dependencies. All functions are stateless and exportable.
 *
 * fortuneteller MCP (hjsh200219/fortuneteller) 참고하여 구현.
 *
 * 대운: 월주 기반 10년 단위 운세.
 *   - 연간 음양 + 성별 → 순행/역행 결정
 *   - 대운 시작 나이 = 절기까지 남은 일수 / 3
 *   - 각 대운의 간지 = 월주에서 순행/역행으로 진행
 */

import { HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_ELEMENTS } from './saju.js';
import { getNextSolarTermDate, getPrevSolarTermDate } from './lunar.js';

// ── 순행/역행 결정 ──────────────────────────────────────────────────────────

/**
 * 대운 진행 방향을 결정합니다.
 *   양남음녀 → 순행 (true)
 *   음남양녀 → 역행 (false)
 *
 * @param {number} yearStemIdx — 연간 인덱스 (0=甲, 1=乙, ...)
 * @param {string} gender — 'male' | 'female'
 * @returns {boolean} true=순행, false=역행
 */
export function isDaeUnForward(yearStemIdx, gender) {
  const isYang = yearStemIdx % 2 === 0;
  const isMale = gender === 'male';
  return (isYang && isMale) || (!isYang && !isMale);
}

// ── 대운 시작 나이 계산 ─────────────────────────────────────────────────────

/**
 * 대운 시작 나이를 계산합니다.
 *   순행: 출생일 → 다음 절기까지 일수 / 3
 *   역행: 출생일 → 이전 절기까지 일수 / 3
 *
 * @param {Date} birthDate
 * @param {boolean} isForward
 * @returns {number} 대운 시작 나이 (0~10)
 */
export function calculateStartAge(birthDate, isForward) {
  let targetDate;
  if (isForward) {
    targetDate = getNextSolarTermDate(birthDate);
  } else {
    targetDate = getPrevSolarTermDate(birthDate);
  }

  if (!targetDate) return 3; // 기본값

  const diffMs = Math.abs(targetDate.getTime() - birthDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const years = Math.round(diffDays / 3);
  return Math.max(0, Math.min(10, years));
}

// ── 대운 생성 ───────────────────────────────────────────────────────────────

/**
 * 대운 주기를 생성합니다.
 *
 * @param {{ year, month, day, hour }} pillars — computeFourPillars() 결과
 * @param {string} gender — 'male' | 'female'
 * @param {Date} birthDate — 생년월일
 * @param {number} [periods=8] — 생성할 대운 수
 * @returns {{ startAge, endAge, stem, branch, stemElement, branchElement }[]}
 */
export function calculateDaeUn(pillars, gender, birthDate, periods = 8) {
  const yearStemIdx = HEAVENLY_STEMS.indexOf(pillars.year.stem);
  const monthStemIdx = HEAVENLY_STEMS.indexOf(pillars.month.stem);
  const monthBranchIdx = EARTHLY_BRANCHES.indexOf(pillars.month.branch);

  const isForward = isDaeUnForward(yearStemIdx, gender);
  const startAge = calculateStartAge(birthDate, isForward);

  const daeUnList = [];

  for (let i = 0; i < periods; i++) {
    const stemIdx = isForward
      ? (monthStemIdx + i + 1) % 10
      : ((monthStemIdx - i - 1) % 10 + 10) % 10;

    const branchIdx = isForward
      ? (monthBranchIdx + i + 1) % 12
      : ((monthBranchIdx - i - 1) % 12 + 12) % 12;

    daeUnList.push({
      startAge: startAge + i * 10,
      endAge: startAge + (i + 1) * 10 - 1,
      stem: HEAVENLY_STEMS[stemIdx],
      branch: EARTHLY_BRANCHES[branchIdx],
      stemElement: STEM_ELEMENTS[stemIdx],
      branchElement: ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'][branchIdx],
    });
  }

  return daeUnList;
}
