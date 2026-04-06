/**
 * api/saju.js — Thin wrapper that re-exports from the shared modules.
 * All calculation logic lives in ../js/ (single source of truth).
 */

import {
  computeFourPillars,
  getDominantElement,
  ELEMENT_DETAIL,
} from '../js/saju.js';

import { analyzeTenGods } from '../js/sipsin.js';
import { getReadingTemplates } from './db.js';

/**
 * Compute a full Saju reading from raw input.
 * 사주 계산 → 십신 분석 → DynamoDB 템플릿 조회까지 한 번에 수행.
 *
 * @param {{ birthDate: string, zodiac: string, gender: string, city: string }} input
 * @returns {Promise<object>} reading
 */
export async function computeReading({ birthDate, zodiac, gender, city }) {
  // 1. 사주 계산
  const pillars  = computeFourPillars({ birthDate, zodiac });
  const dominant = getDominantElement(pillars);
  const detail   = ELEMENT_DETAIL[dominant];

  // 2. 십신 분석
  const tenGods = analyzeTenGods(pillars);

  // 3. DynamoDB에서 관련 템플릿 조회
  const tenGodList = Object.keys(tenGods.summary);
  const templates = await getReadingTemplates(pillars.day.stem, tenGods.structure, tenGodList);

  return {
    input: { birthDate, zodiac, gender, city },
    pillars,
    dominant,
    detail,
    tenGods,
    templates,
  };
}
