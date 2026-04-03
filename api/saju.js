/**
 * api/saju.js — Thin wrapper that re-exports from the shared module.
 * All calculation logic lives in ../js/saju.js (single source of truth).
 */

import {
  computeFourPillars,
  getDominantElement,
  ELEMENT_DETAIL,
} from '../js/saju.js';

/**
 * Compute a full Saju reading from raw input.
 * @param {{ birthDate: string, zodiac: string, gender: string, city: string }} input
 * @returns {object} reading
 */
export function computeReading({ birthDate, zodiac, gender, city }) {
  const pillars  = computeFourPillars({ birthDate, zodiac });
  const dominant = getDominantElement(pillars);
  const detail   = ELEMENT_DETAIL[dominant];

  return {
    input: { birthDate, zodiac, gender, city },
    pillars,
    dominant,
    detail,
  };
}
