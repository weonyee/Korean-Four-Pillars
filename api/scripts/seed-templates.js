/**
 * 템플릿 데이터를 DynamoDB에 시딩하는 일회성 스크립트.
 *
 * 실행: cd api && node scripts/seed-templates.js
 */

import { seedTemplates } from '../db.js';
import { DAY_STEM_TEMPLATES, TEN_GOD_TEMPLATES, STRUCTURE_TEMPLATES } from '../../data/saju-templates.js';
import { DAY_PILLAR_TEMPLATES, TEN_GOD_POSITION_TEMPLATES, ELEMENT_BALANCE_TEMPLATES } from '../../data/saju-templates-extended.js';
import { SINSAL_TEMPLATES, RELATION_TEMPLATES, NAYIN_TEMPLATES, YONGSIN_TEMPLATES } from '../../data/saju-templates-advanced.js';
import { GTBG_TEMPLATES } from '../../data/saju-templates-gtbg.js';
import { SIPSIN_PATTERN_TEMPLATES, TWELVE_STAGES_TEMPLATES, STEM_COMBO_TEMPLATES } from '../../data/saju-templates-patterns.js';
import { GENDER_TEN_GOD_TEMPLATES, GENDER_SINSAL_TEMPLATES, GENDER_POSITION_TEMPLATES } from '../../data/saju-templates-gender.js';

const allTemplates = {
  DAY_STEM_TEMPLATES,
  TEN_GOD_TEMPLATES,
  STRUCTURE_TEMPLATES,
  DAY_PILLAR_TEMPLATES,
  TEN_GOD_POSITION_TEMPLATES,
  ELEMENT_BALANCE_TEMPLATES,
  SINSAL_TEMPLATES,
  RELATION_TEMPLATES,
  NAYIN_TEMPLATES,
  YONGSIN_TEMPLATES,
  GTBG_TEMPLATES,
  SIPSIN_PATTERN_TEMPLATES,
  TWELVE_STAGES_TEMPLATES,
  STEM_COMBO_TEMPLATES,
  GENDER_TEN_GOD_TEMPLATES,
  GENDER_SINSAL_TEMPLATES,
  GENDER_POSITION_TEMPLATES,
};

console.log('Seeding templates to DynamoDB...');
let totalExpected = 0;
for (const [name, data] of Object.entries(allTemplates)) {
  const key = name.replace('_TEMPLATES', '').toLowerCase();
  const count = Object.keys(data).length;
  totalExpected += count;
  console.log(`  ${key.padEnd(22)} ${count}개`);
}
console.log(`  ${'─'.repeat(30)}`);
console.log(`  ${'예상 총합'.padEnd(20)} ${totalExpected}개`);

try {
  const count = await seedTemplates(allTemplates);
  console.log(`\nDone! ${count}개 템플릿 시딩 완료.`);
} catch (err) {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
}
