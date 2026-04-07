/**
 * export-templates-to-json.mjs
 *
 * data/*.js 의 템플릿 데이터를 하나의 JSON 파일로 합칩니다.
 * 출력: data/templates.json
 *
 * Usage: node scripts/export-templates-to-json.mjs
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../data');

// Windows에서 file:// URL로 변환
const toFileUrl = (p) => new URL(`file:///${p.replace(/\\/g, '/')}`).href;

// 각 템플릿 파일 import
const base       = await import(toFileUrl(resolve(dataDir, 'saju-templates.js')));
const extended   = await import(toFileUrl(resolve(dataDir, 'saju-templates-extended.js')));
const advanced   = await import(toFileUrl(resolve(dataDir, 'saju-templates-advanced.js')));
const patterns   = await import(toFileUrl(resolve(dataDir, 'saju-templates-patterns.js')));
const gender     = await import(toFileUrl(resolve(dataDir, 'saju-templates-gender.js')));
const gtbg       = await import(toFileUrl(resolve(dataDir, 'saju-templates-gtbg.js')));
const strength   = await import(toFileUrl(resolve(dataDir, 'saju-templates-strength.js')));
const position   = await import(toFileUrl(resolve(dataDir, 'saju-templates-position.js')));
const relations2 = await import(toFileUrl(resolve(dataDir, 'saju-templates-relations2.js')));

// type → { key → content } 구조로 통합
const templates = {};

function addType(typeName, data) {
  if (!data || typeof data !== 'object') return;
  templates[typeName] = data;
}

// base
addType('day_stem', base.DAY_STEM_TEMPLATES);
addType('ten_god', base.TEN_GOD_TEMPLATES);
addType('structure', base.STRUCTURE_TEMPLATES);

// extended
addType('day_pillar', extended.DAY_PILLAR_TEMPLATES);
addType('ten_god_position', extended.TEN_GOD_POSITION_TEMPLATES);
addType('element_balance', extended.ELEMENT_BALANCE_TEMPLATES);

// advanced
addType('sinsal', advanced.SINSAL_TEMPLATES);
addType('relation', advanced.RELATION_TEMPLATES);
addType('nayin', advanced.NAYIN_TEMPLATES);
addType('yongsin', advanced.YONGSIN_TEMPLATES);

// patterns
addType('sipsin_pattern', patterns.SIPSIN_PATTERN_TEMPLATES);
addType('twelve_stages', patterns.TWELVE_STAGES_TEMPLATES);
addType('stem_combo', patterns.STEM_COMBO_TEMPLATES);

// gender
addType('gender_ten_god', gender.GENDER_TEN_GOD_TEMPLATES);
addType('gender_sinsal', gender.GENDER_SINSAL_TEMPLATES);
addType('gender_position', gender.GENDER_POSITION_TEMPLATES);

// gtbg
addType('gtbg', gtbg.GTBG_TEMPLATES);

// strength (일간×강약, 일간×격국)
addType('day_stem_strength', strength.DAY_STEM_STRENGTH_TEMPLATES);
addType('day_stem_structure', strength.DAY_STEM_STRUCTURE_TEMPLATES);

// position (십신×위치, 대운)
addType('ten_god_position_ext', position.TEN_GOD_POSITION_EXTENDED_TEMPLATES);
addType('daeun', relations2.DAEUN_TEMPLATES || position.DAEUN_TEMPLATES);

// relations2 (오행관계, 일간×용신, 격국×강약, 합충×위치)
addType('element_interaction', relations2.ELEMENT_INTERACTION_TEMPLATES);
addType('day_stem_yongsin', relations2.DAY_STEM_YONGSIN_TEMPLATES);
addType('structure_strength', relations2.STRUCTURE_STRENGTH_TEMPLATES);
addType('relation_position', relations2.RELATION_POSITION_TEMPLATES);

// 통계
let totalCount = 0;
for (const [type, data] of Object.entries(templates)) {
  const count = Object.keys(data).length;
  totalCount += count;
  console.log(`  ${type}: ${count}개`);
}

const outPath = resolve(dataDir, 'templates.json');
writeFileSync(outPath, JSON.stringify(templates, null, 2), 'utf8');

const sizeKB = (Buffer.byteLength(JSON.stringify(templates)) / 1024).toFixed(1);
console.log(`\nTotal: ${totalCount}개 템플릿 → ${outPath} (${sizeKB}KB)`);
