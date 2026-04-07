/**
 * result.js — Entry point for result.html.
 * Fetches reading from API, falls back to local computation if unavailable.
 */

import { computeFourPillars, getDominantElement, HEAVENLY_STEMS, STEM_ELEMENTS, BRANCH_ELEMENTS, EARTHLY_BRANCHES } from './saju.js';
import { fetchReading } from './api.js';
import {
  buildHeroHtml,
  buildPillarsHtml,
  buildPillarsRow2Html,
  buildDestinyHtml,
  buildLuckCyclesHtml,
  buildWisdomHtml,
} from './result-render.js';
import { analyzeTenGods, TEN_GODS, BRANCH_HIDDEN_STEMS } from './sipsin.js';
import { analyzeSinSal } from './sinsal.js';
import { analyzeRelations } from './relations.js';
import { calculateDaeUn } from './daeun.js';
import { selectYongSin } from './yongsin.js';
import { correctBirthTime } from './solar-time.js';

// ── Default / fallback data ───────────────────────────────────────────────────

const DEFAULTS = {
  birthDate: '1990-01-01',
  zodiac:    'RAT',
  city:      'Seoul',
  gender:    'male',
};

const VALID_ZODIACS = new Set([
  'RAT','OX','TIGER','RABBIT','DRAGON','SNAKE',
  'HORSE','SHEEP','MONKEY','ROOSTER','DOG','PIG',
]);

function getParams() {
  const p = new URLSearchParams(location.search);

  const date   = p.get('date')   || '';
  const zodiac = (p.get('zodiac') || '').toUpperCase();

  // Validate date format and range
  const parsedDate = new Date(date + 'T12:00:00');
  const validDate  = date && !isNaN(parsedDate) && parsedDate.getFullYear() > 1000
    ? date
    : DEFAULTS.birthDate;

  return {
    birthDate: validDate,
    zodiac:    VALID_ZODIACS.has(zodiac) ? zodiac : DEFAULTS.zodiac,
    city:      p.get('city')?.trim()    || DEFAULTS.city,
    gender:    p.get('gender') === 'female' ? 'female' : DEFAULTS.gender,
    birthTime: p.get('time') || '',
  };
}

function inject(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function render(reading) {
  const { pillars, dominant, input } = reading;

  // Guard: ensure all required fields are present before rendering
  if (!pillars || !dominant || !input?.birthDate) {
    console.warn('render: incomplete reading data, using defaults');
    const fallback = computeFourPillars(DEFAULTS);
    return render({ pillars: fallback, dominant: getDominantElement(fallback), input: DEFAULTS });
  }

  const birthYear = new Date(input.birthDate + 'T12:00:00').getFullYear();

  inject('result-hero',      buildHeroHtml({ ...input, dominant }));
  inject('result-pillars',   buildPillarsHtml(pillars));
  inject('result-pillars-2', buildPillarsRow2Html(pillars));
  inject('result-destiny',   buildDestinyHtml(dominant));
  inject('result-luck',      buildLuckCyclesHtml(birthYear));
  inject('result-wisdom',    buildWisdomHtml(dominant));
}

async function init() {
  const params = getParams();

  try {
    const reading = await fetchReading(params);
    render(reading);
  } catch {
    // API unreachable — compute locally
    const pillars  = computeFourPillars(params);
    const dominant = getDominantElement(pillars);
    render({ pillars, dominant, input: params });
  }
}

// ── Test Panel (테스트용 사주 분석) ──────────────────────────────────────────

const ZODIAC_MAP = [
  { start: 23, end: 1,  name: 'RAT',     ko: '자(子)' },
  { start: 1,  end: 3,  name: 'OX',      ko: '축(丑)' },
  { start: 3,  end: 5,  name: 'TIGER',   ko: '인(寅)' },
  { start: 5,  end: 7,  name: 'RABBIT',  ko: '묘(卯)' },
  { start: 7,  end: 9,  name: 'DRAGON',  ko: '진(辰)' },
  { start: 9,  end: 11, name: 'SNAKE',   ko: '사(巳)' },
  { start: 11, end: 13, name: 'HORSE',   ko: '오(午)' },
  { start: 13, end: 15, name: 'SHEEP',   ko: '미(未)' },
  { start: 15, end: 17, name: 'MONKEY',  ko: '신(申)' },
  { start: 17, end: 19, name: 'ROOSTER', ko: '유(酉)' },
  { start: 19, end: 21, name: 'DOG',     ko: '술(戌)' },
  { start: 21, end: 23, name: 'PIG',     ko: '해(亥)' },
];

function hourToZodiac(hour) {
  if (hour === 23 || hour < 1) return ZODIAC_MAP[0];
  return ZODIAC_MAP.find(z => hour >= z.start && hour < z.end) || ZODIAC_MAP[0];
}

function formatPillar(p) {
  const stemIdx = HEAVENLY_STEMS.indexOf(p.stem);
  const branchIdx = EARTHLY_BRANCHES.indexOf(p.branch);
  const stemEl = STEM_ELEMENTS[stemIdx];
  const branchEl = BRANCH_ELEMENTS[branchIdx];
  return `${p.stem}${p.branch} (${stemEl}/${branchEl})`;
}

function runTestAnalysis() {
  const dateVal   = document.getElementById('test-date').value;
  const timeVal   = document.getElementById('test-time').value;
  const genderVal = document.getElementById('test-gender').value;
  const cityVal   = document.getElementById('test-city').value || 'Seoul';

  if (!dateVal) { alert('생년월일을 입력하세요.'); return; }

  const [h, m] = (timeVal || '12:00').split(':').map(Number);
  const zodiacInfo = hourToZodiac(h);
  const birthDate = new Date(dateVal + 'T12:00:00');

  // 진태양시 보정
  let solarCorr = null;
  if (timeVal && cityVal) {
    solarCorr = correctBirthTime(birthDate, h, m, cityVal);
  }

  const resolvedZodiac = solarCorr ? solarCorr.zodiac : zodiacInfo.name;

  // 4주 계산
  const pillars = computeFourPillars({ birthDate: dateVal, zodiac: resolvedZodiac, birthTime: timeVal, city: cityVal });
  const dominant = getDominantElement(pillars);

  // 십신 분석
  const tenGods = analyzeTenGods(pillars);

  // 신살
  const sinsal = analyzeSinSal(pillars);

  // 합충형파해
  const relations = analyzeRelations(pillars);

  // 대운
  const daeun = calculateDaeUn(pillars, genderVal, birthDate);

  // 용신
  const yongsin = selectYongSin(pillars);

  // 지지장간
  const hiddenStemsInfo = ['year', 'month', 'day', 'hour'].map(pos => {
    const branch = pillars[pos].branch;
    const hidden = BRANCH_HIDDEN_STEMS[branch] || [];
    return `${branch}: ${hidden.join(' ')}`;
  });

  // 출력 생성
  const lines = [];
  const hr = '─'.repeat(50);

  lines.push(`${hr}`);
  lines.push(`  사주 분석 결과`);
  lines.push(`  ${dateVal} ${timeVal || '시간 미입력'} | ${genderVal === 'male' ? '남' : '여'} | ${cityVal}`);
  lines.push(`${hr}`);

  // 진태양시
  if (solarCorr) {
    lines.push('');
    lines.push(`⏱ 진태양시 보정`);
    lines.push(`  입력 시간: ${timeVal}`);
    lines.push(`  보정 시간: ${String(solarCorr.trueSolarHour).padStart(2,'0')}:${String(solarCorr.trueSolarMinute).padStart(2,'0')} (${solarCorr.correctionMinutes > 0 ? '+' : ''}${solarCorr.correctionMinutes}분)`);
    lines.push(`  시지 변환: ${zodiacInfo.ko} → ${hourToZodiac(solarCorr.trueSolarHour).ko}`);
  }

  // 만세력 (4주)
  lines.push('');
  lines.push(`┌────────┬────────┬────────┬────────┐`);
  lines.push(`│  년주  │  월주  │  일주  │  시주  │`);
  lines.push(`├────────┼────────┼────────┼────────┤`);
  lines.push(`│  ${pillars.year.stem}    │  ${pillars.month.stem}    │  ${pillars.day.stem}    │  ${pillars.hour.stem}    │ 천간`);
  lines.push(`│  ${pillars.year.branch}    │  ${pillars.month.branch}    │  ${pillars.day.branch}    │  ${pillars.hour.branch}    │ 지지`);
  lines.push(`└────────┴────────┴────────┴────────┘`);
  lines.push(`  ${formatPillar(pillars.year)}  ${formatPillar(pillars.month)}  ${formatPillar(pillars.day)}  ${formatPillar(pillars.hour)}`);

  // 지지장간
  lines.push('');
  lines.push(`📦 지지장간 (숨은 천간)`);
  hiddenStemsInfo.forEach((info, i) => {
    const labels = ['년지', '월지', '일지', '시지'];
    lines.push(`  ${labels[i]}: ${info}`);
  });

  // 십신
  lines.push('');
  lines.push(`${hr}`);
  lines.push(`🔟 십신 분석`);
  lines.push(`${hr}`);
  lines.push(`  일간: ${pillars.day.stem} (${STEM_ELEMENTS[HEAVENLY_STEMS.indexOf(pillars.day.stem)]})`);
  lines.push(`  격국: ${tenGods.structure}`);
  lines.push(`  주도 오행: ${dominant}`);
  lines.push('');
  lines.push(`  ┌────────┬────────┬────────┬────────┐`);
  lines.push(`  │  년주  │  월주  │  일주  │  시주  │`);
  lines.push(`  ├────────┼────────┼────────┼────────┤`);
  const tg = tenGods.pillars;
  lines.push(`  │ ${(tg.year.stem).padEnd(5)}  │ ${(tg.month.stem).padEnd(5)}  │ ${(tg.day.stem).padEnd(5)}  │ ${(tg.hour.stem).padEnd(5)}  │ 천간 십신`);
  lines.push(`  │ ${(tg.year.branch).padEnd(5)}  │ ${(tg.month.branch).padEnd(5)}  │ ${(tg.day.branch).padEnd(5)}  │ ${(tg.hour.branch).padEnd(5)}  │ 지지 십신`);
  lines.push(`  └────────┴────────┴────────┴────────┘`);

  lines.push('');
  lines.push(`  십신 분포:`);
  for (const [god, count] of Object.entries(tenGods.summary).sort((a,b) => b[1] - a[1])) {
    const info = TEN_GODS[god];
    const bar = '█'.repeat(count) + '░'.repeat(4 - count);
    lines.push(`    ${god} ${info ? info.hanja : ''} ${bar} ×${count}`);
  }

  // 용신
  lines.push('');
  lines.push(`${hr}`);
  lines.push(`⚖️ 일간 강약 & 용신`);
  lines.push(`${hr}`);
  const str = yongsin.strength;
  const levelKo = { very_strong: '극신강', strong: '신강', medium: '중화', weak: '신약', very_weak: '극신약' };
  const gauge = '█'.repeat(Math.round(str.score / 10)) + '░'.repeat(10 - Math.round(str.score / 10));
  lines.push(`  강약: ${levelKo[str.level]} (${str.score}점/100) [${gauge}]`);
  lines.push(`  일간 오행: ${str.dayElement}`);
  lines.push(`  용신: ${yongsin.yongsin.primary} (${yongsin.yongsin.attrs.colors.join(', ')})`);
  lines.push(`  희신: ${yongsin.yongsin.secondary}`);
  lines.push(`  기신: ${yongsin.gisin.primary} / ${yongsin.gisin.secondary}`);
  lines.push(`  추천 방향: ${yongsin.yongsin.attrs.direction}`);
  lines.push(`  추천 직업: ${yongsin.yongsin.attrs.careers.join(', ')}`);

  // 신살
  lines.push('');
  lines.push(`${hr}`);
  lines.push(`✨ 신살 (${sinsal.length}개)`);
  lines.push(`${hr}`);
  if (sinsal.length === 0) {
    lines.push(`  (해당 신살 없음)`);
  } else {
    for (const s of sinsal) {
      const icon = s.type === 'lucky' ? '🟢' : s.type === 'neutral' ? '🟡' : '🔴';
      lines.push(`  ${icon} ${s.name} (${s.hanja}) — ${s.type === 'lucky' ? '길신' : s.type === 'neutral' ? '중성' : '흉신'}`);
    }
  }

  // 합충형파해
  lines.push('');
  lines.push(`${hr}`);
  lines.push(`🔗 합충형파해`);
  lines.push(`${hr}`);
  let hasRelation = false;
  for (const [type, items] of Object.entries(relations)) {
    if (items.length > 0) {
      hasRelation = true;
      const typeKo = { samhap:'삼합', banghap:'방합', yukhap:'육합', chung:'충', hyung:'형', pa:'파', hae:'해' };
      for (const item of items) {
        const icon = ['samhap','banghap','yukhap'].includes(type) ? '🔵' : '🔴';
        lines.push(`  ${icon} ${typeKo[type]}: ${item.name}${item.type ? ' (' + item.type + ')' : ''}`);
      }
    }
  }
  if (!hasRelation) lines.push(`  (해당 관계 없음)`);

  // 대운
  lines.push('');
  lines.push(`${hr}`);
  lines.push(`🌊 대운 (10년 주기)`);
  lines.push(`${hr}`);
  for (const d of daeun) {
    const age = `${d.startAge}~${d.endAge}세`;
    lines.push(`  ${age.padEnd(10)} ${d.stem}${d.branch} (${d.stemElement}/${d.branchElement})`);
  }

  const output = document.getElementById('test-output');
  output.textContent = lines.join('\n');
  output.classList.remove('hidden');
}

function initTestPanel() {
  const runBtn = document.getElementById('test-run');
  const toggleBtn = document.getElementById('test-toggle');
  const formArea = document.getElementById('test-form-area');

  if (runBtn) runBtn.addEventListener('click', runTestAnalysis);

  if (toggleBtn && formArea) {
    toggleBtn.addEventListener('click', () => {
      const hidden = formArea.classList.toggle('hidden');
      toggleBtn.textContent = hidden ? '펼치기 ▼' : '접기 ▲';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initTestPanel();
});
