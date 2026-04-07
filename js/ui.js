/**
 * ui.js — DOM interactions and event wiring.
 * Imports pure logic from saju.js and the Modal component.
 * This is the only file that touches the DOM.
 */

import {
  computeFourPillars,
  getDominantElement,
  HEAVENLY_STEMS,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  EARTHLY_BRANCHES,
} from './saju.js';
import { fetchReading } from './api.js';
import { initCitySearch } from './city-search.js';
import { correctBirthTime, getCityCoords } from './solar-time.js';
import { getSajuYear, getSajuMonth } from './lunar.js';
import { analyzeTenGods, TEN_GODS, BRANCH_HIDDEN_STEMS } from './sipsin.js';
import { analyzeSinSal } from './sinsal.js';
import { analyzeRelations } from './relations.js';
import { calculateDaeUn } from './daeun.js';
import { selectYongSin } from './yongsin.js';
import { generateInterpretation } from './llm.js';

const LLM_API_URL = 'https://osq273me7kgslgfuuea4xj5dx40vqphp.lambda-url.ap-northeast-2.on.aws/';

// ── Loading overlay ───────────────────────────────────────────────────────────

const loadingOverlay = document.getElementById('loading-overlay');

function showLoading() {
  loadingOverlay.classList.remove('closing');
  loadingOverlay.classList.add('open');
}



const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Gender selector ───────────────────────────────────────────────────────────

function initGenderSelector() {
  const buttons = document.querySelectorAll('.gender-btn');
  const hidden  = document.getElementById('selected-gender');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      hidden.value = btn.dataset.gender;
      updateTestPreview();
    });
  });
}

// ── Zodiac selector (removed — time input determines hour pillar directly) ───

// ── Mobile nav ────────────────────────────────────────────────────────────────

function initMobileNav() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const nav     = document.getElementById('mobile-nav');
  menuBtn?.addEventListener('click', () => nav.classList.toggle('hidden'));
}

// ── City autocomplete ─────────────────────────────────────────────────────────

function initCityAutocomplete() {
  const input = document.getElementById('birth-city');
  if (!input) return;
  initCitySearch(input, ({ label }) => {
    input.value = label;
    updateSolarTimeHint();
  });
}

// ── Solar time correction ────────────────────────────────────────────────────

function updateSolarTimeHint() {
  const timeInput = document.getElementById('birth-time');
  const cityInput = document.getElementById('birth-city');
  const dateInput = document.getElementById('birth-date');
  const hint      = document.getElementById('solar-time-hint');
  if (!timeInput || !cityInput || !hint) return;

  const birthTime = timeInput.value;
  const city      = cityInput.value.trim();
  const birthDate = dateInput?.value;

  if (!birthTime || !city) {
    hint.classList.add('hidden');
    return;
  }

  const date = birthDate ? new Date(birthDate + 'T12:00:00') : new Date();
  const [h, m] = birthTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) { hint.classList.add('hidden'); return; }

  const correction = correctBirthTime(date, h, m, city);
  if (!correction) {
    hint.classList.add('hidden');
    return;
  }

  const sign = correction.correctionMinutes >= 0 ? '+' : '';
  const ch = String(correction.trueSolarHour).padStart(2, '0');
  const cm = String(correction.trueSolarMinute).padStart(2, '0');
  hint.textContent = `True solar time: ${ch}:${cm} (${sign}${correction.correctionMinutes}min correction for ${city})`;
  hint.classList.remove('hidden');

  // Auto-select the corrected zodiac button
  const zodiacButtons = document.querySelectorAll('.zodiac-btn');
  const hiddenZodiac  = document.getElementById('selected-zodiac');
  zodiacButtons.forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.zodiac === correction.zodiac) {
      btn.classList.add('selected');
    }
  });
  if (hiddenZodiac) hiddenZodiac.value = correction.zodiac;
  updateTestPreview();
}

function syncBirthTime() {
  const hInput = document.getElementById('birth-time-hour');
  const mInput = document.getElementById('birth-time-min');
  const hidden = document.getElementById('birth-time');
  if (!hInput || !mInput || !hidden) return;

  const h = hInput.value.padStart(2, '0');
  const m = (mInput.value || '0').padStart(2, '0');
  hidden.value = hInput.value !== '' ? `${h}:${m}` : '';
  updateSolarTimeHint();
}

function initSolarTimeCorrection() {
  const hInput   = document.getElementById('birth-time-hour');
  const mInput   = document.getElementById('birth-time-min');
  const cityInput = document.getElementById('birth-city');
  const dateInput = document.getElementById('birth-date');

  hInput?.addEventListener('input', syncBirthTime);
  mInput?.addEventListener('input', syncBirthTime);
  cityInput?.addEventListener('change', updateSolarTimeHint);
  dateInput?.addEventListener('change', () => { syncBirthTime(); updateSolarTimeHint(); });
}

// ── Test Preview Panel ────────────────────────────────────────────────────

const ELEMENT_KO = { Wood: '목(木)', Fire: '화(火)', Earth: '토(土)', Metal: '금(金)', Water: '수(水)' };

function updateTestPreview() {
  const output = document.getElementById('test-preview-output');
  const panel  = document.getElementById('test-preview-panel');
  if (!output || !panel || panel.classList.contains('hidden')) return;

  const birthDate = document.getElementById('birth-date')?.value;
  const zodiac    = document.getElementById('selected-zodiac')?.value;
  const city      = document.getElementById('birth-city')?.value.trim();
  const gender    = document.getElementById('selected-gender')?.value || 'male';

  // 시간 필드에서 직접 읽기 (hidden 필드 동기화 문제 방지)
  const hourEl = document.getElementById('birth-time-hour');
  const minEl  = document.getElementById('birth-time-min');
  let birthTime = '';
  if (hourEl && hourEl.value !== '') {
    const hh = hourEl.value.padStart(2, '0');
    const mm = (minEl?.value || '0').padStart(2, '0');
    birthTime = `${hh}:${mm}`;
    const hiddenTime = document.getElementById('birth-time');
    if (hiddenTime) hiddenTime.value = birthTime;
  }

  if (!birthDate) {
    output.textContent = '  생년월일을 입력해주세요.';
    return;
  }

  try {
    const pillars  = computeFourPillars({ birthDate, zodiac, birthTime, city, gender });
    const dominant = getDominantElement(pillars);
    const date     = new Date(birthDate + 'T12:00:00');

    const lines = [];
    const hr = '\u2500'.repeat(56);

    // ── 헤더 ──
    lines.push(hr);
    lines.push(`  ${birthDate} ${birthTime || '(시간 미입력)'} | ${gender === 'male' ? '남' : '여'} | ${city || '도시 미입력'}`);
    lines.push(hr);

    // ── 진태양시 보정 ──
    if (pillars.solarTimeCorrection) {
      const c = pillars.solarTimeCorrection;
      const ch = String(c.correctedHour).padStart(2, '0');
      const cm = String(c.correctedMinute).padStart(2, '0');
      lines.push('');
      lines.push(`  ⏱ 진태양시 보정: ${c.originalTime} → ${ch}:${cm}`);
    }

    // ── 사주 테이블 ──
    const fmt = (p) => {
      if (!p) return null;
      const si = HEAVENLY_STEMS.indexOf(p.stem);
      const bi = EARTHLY_BRANCHES.indexOf(p.branch);
      return { stem: p.stem, branch: p.branch, stemEl: STEM_ELEMENTS[si], branchEl: BRANCH_ELEMENTS[bi] };
    };
    const y = fmt(pillars.year), m = fmt(pillars.month), d = fmt(pillars.day), h = fmt(pillars.hour);
    const hasHour = h !== null;

    lines.push('');
    if (hasHour) {
      lines.push('  ┌────────┬────────┬────────┬────────┐');
      lines.push('  │  년주  │  월주  │  일주  │  시주  │');
      lines.push('  ├────────┼────────┼────────┼────────┤');
      lines.push(`  │  ${y.stem}    │  ${m.stem}    │  ${d.stem}    │  ${h.stem}    │ 천간`);
      lines.push(`  │  ${y.branch}    │  ${m.branch}    │  ${d.branch}    │  ${h.branch}    │ 지지`);
      lines.push('  └────────┴────────┴────────┴────────┘');
    } else {
      lines.push('  ┌────────┬────────┬────────┐');
      lines.push('  │  년주  │  월주  │  일주  │');
      lines.push('  ├────────┼────────┼────────┤');
      lines.push(`  │  ${y.stem}    │  ${m.stem}    │  ${d.stem}    │ 천간`);
      lines.push(`  │  ${y.branch}    │  ${m.branch}    │  ${d.branch}    │ 지지`);
      lines.push('  └────────┴────────┴────────┘');
      lines.push('  (시주: 생시 미입력)');
    }

    // ── 오행 ──
    lines.push('');
    const stemEls = [y.stemEl, m.stemEl, d.stemEl];
    const branchEls = [y.branchEl, m.branchEl, d.branchEl];
    if (hasHour) { stemEls.push(h.stemEl); branchEls.push(h.branchEl); }
    lines.push(`  천간 오행: ${stemEls.map(e => ELEMENT_KO[e]).join(' ')}`);
    lines.push(`  지지 오행: ${branchEls.map(e => ELEMENT_KO[e]).join(' ')}`);

    // ── 오행 분포 ──
    const elCount = {};
    const activePillars = hasHour ? [y, m, d, h] : [y, m, d];
    activePillars.forEach(p => {
      elCount[p.stemEl] = (elCount[p.stemEl] || 0) + 1;
      elCount[p.branchEl] = (elCount[p.branchEl] || 0) + 1;
    });
    lines.push('');
    lines.push('  오행 분포:');
    for (const [el, cnt] of Object.entries(elCount).sort((a, b) => b[1] - a[1])) {
      const bar = '\u2588'.repeat(cnt) + '\u2591'.repeat(8 - cnt);
      lines.push(`    ${ELEMENT_KO[el].padEnd(6)} ${bar} ${cnt}`);
    }

    // ── 지지장간 ──
    lines.push('');
    lines.push(hr);
    lines.push('  📦 지지장간 (숨은 천간)');
    lines.push(hr);
    const posLabels = { year: '년지', month: '월지', day: '일지', hour: '시지' };
    for (const pos of ['year', 'month', 'day', 'hour']) {
      if (!pillars[pos]) continue;
      const branch = pillars[pos].branch;
      const hidden = BRANCH_HIDDEN_STEMS[branch] || [];
      lines.push(`  ${posLabels[pos]} ${branch}: ${hidden.join(' ')}`);
    }

    // ── 십신 분석 ──
    const tenGods = analyzeTenGods(pillars);
    lines.push('');
    lines.push(hr);
    lines.push('  🔟 십신 분석');
    lines.push(hr);
    lines.push(`  일간: ${d.stem} (${ELEMENT_KO[d.stemEl]})`);
    lines.push(`  격국: ${tenGods.structure}`);
    lines.push('');
    const tg = tenGods.pillars;
    if (hasHour) {
      lines.push('  ┌────────┬────────┬────────┬────────┐');
      lines.push('  │  년주  │  월주  │  일주  │  시주  │');
      lines.push('  ├────────┼────────┼────────┼────────┤');
      lines.push(`  │ ${(tg.year.stem).padEnd(5)}  │ ${(tg.month.stem).padEnd(5)}  │ ${(tg.day.stem).padEnd(5)}  │ ${(tg.hour.stem).padEnd(5)}  │ 천간`);
      lines.push(`  │ ${(tg.year.branch).padEnd(5)}  │ ${(tg.month.branch).padEnd(5)}  │ ${(tg.day.branch).padEnd(5)}  │ ${(tg.hour.branch).padEnd(5)}  │ 지지`);
      lines.push('  └────────┴────────┴────────┴────────┘');
    } else {
      lines.push('  ┌────────┬────────┬────────┐');
      lines.push('  │  년주  │  월주  │  일주  │');
      lines.push('  ├────────┼────────┼────────┤');
      lines.push(`  │ ${(tg.year.stem).padEnd(5)}  │ ${(tg.month.stem).padEnd(5)}  │ ${(tg.day.stem).padEnd(5)}  │ 천간`);
      lines.push(`  │ ${(tg.year.branch).padEnd(5)}  │ ${(tg.month.branch).padEnd(5)}  │ ${(tg.day.branch).padEnd(5)}  │ 지지`);
      lines.push('  └────────┴────────┴────────┘');
    }
    lines.push('');
    lines.push('  십신 분포:');
    for (const [god, count] of Object.entries(tenGods.summary).sort((a,b) => b[1] - a[1])) {
      const info = TEN_GODS[god];
      const bar = '\u2588'.repeat(count) + '\u2591'.repeat(4 - count);
      lines.push(`    ${god} ${info ? info.hanja : ''} ${bar} ×${count}`);
    }

    // ── 용신 분석 ──
    const yongsin = selectYongSin(pillars);
    lines.push('');
    lines.push(hr);
    lines.push('  ⚖️ 일간 강약 & 용신');
    lines.push(hr);
    const str = yongsin.strength;
    const levelKo = { very_strong: '극신강', strong: '신강', medium: '중화', weak: '신약', very_weak: '극신약' };
    const gauge = '\u2588'.repeat(Math.round(str.score / 10)) + '\u2591'.repeat(10 - Math.round(str.score / 10));
    lines.push(`  강약: ${levelKo[str.level]} (${str.score}점/100) [${gauge}]`);
    lines.push(`  일간 오행: ${ELEMENT_KO[str.dayElement]}`);
    lines.push(`  용신: ${ELEMENT_KO[yongsin.yongsin.primary]} | 희신: ${ELEMENT_KO[yongsin.yongsin.secondary]}`);
    lines.push(`  기신: ${ELEMENT_KO[yongsin.gisin.primary]} / ${ELEMENT_KO[yongsin.gisin.secondary]}`);
    lines.push(`  추천색: ${yongsin.yongsin.attrs.colors.join(', ')}`);
    lines.push(`  추천방향: ${yongsin.yongsin.attrs.direction}`);
    lines.push(`  추천직업: ${yongsin.yongsin.attrs.careers.join(', ')}`);

    // ── 신살 ──
    const sinsal = analyzeSinSal(pillars);
    lines.push('');
    lines.push(hr);
    lines.push(`  ✨ 신살 (${sinsal.length}개)`);
    lines.push(hr);
    if (sinsal.length === 0) {
      lines.push('  (해당 신살 없음)');
    } else {
      for (const s of sinsal) {
        const icon = s.type === 'lucky' ? '🟢' : s.type === 'neutral' ? '🟡' : '🔴';
        const typeKo = s.type === 'lucky' ? '길신' : s.type === 'neutral' ? '중성' : '흉신';
        lines.push(`  ${icon} ${s.name} (${s.hanja}) — ${typeKo}`);
      }
    }

    // ── 합충형파해 ──
    const relations = analyzeRelations(pillars);
    lines.push('');
    lines.push(hr);
    lines.push('  🔗 합충형파해');
    lines.push(hr);
    let hasRelation = false;
    const typeKoMap = { samhap:'삼합', banghap:'방합', yukhap:'육합', chung:'충', hyung:'형', pa:'파', hae:'해' };
    for (const [type, items] of Object.entries(relations)) {
      if (items.length > 0) {
        hasRelation = true;
        for (const item of items) {
          const icon = ['samhap','banghap','yukhap'].includes(type) ? '🔵' : '🔴';
          lines.push(`  ${icon} ${typeKoMap[type]}: ${item.name}${item.type ? ' (' + item.type + ')' : ''}`);
        }
      }
    }
    if (!hasRelation) lines.push('  (해당 관계 없음)');

    // ── 대운 ──
    const daeun = calculateDaeUn(pillars, gender, date);
    lines.push('');
    lines.push(hr);
    lines.push('  🌊 대운 (10년 주기)');
    lines.push(hr);
    for (const du of daeun) {
      const age = `${du.startAge}~${du.endAge}세`;
      lines.push(`  ${age.padEnd(10)} ${du.stem}${du.branch} (${ELEMENT_KO[du.stemElement]}/${ELEMENT_KO[du.branchElement]})`);
    }

    output.textContent = lines.join('\n');

    // LLM 해석 버튼 렌더
    const llmArea = document.getElementById('llm-interpretation-area');
    const llmBtn  = document.getElementById('llm-interpret-btn');
    if (llmArea && llmBtn) {
      llmBtn.classList.remove('hidden');
      // 데이터 저장 (버튼 클릭 시 사용)
      llmBtn._sajuData = { pillars, tenGods, yongsin, sinsal, relations, daeun, gender, birthDate, birthTime, city };
    }
  } catch (err) {
    output.textContent = `  Error: ${err.message}`;
  }
}

async function requestLLMInterpretation() {
  const btn     = document.getElementById('llm-interpret-btn');
  const llmArea = document.getElementById('llm-interpretation-area');
  if (!btn?._sajuData || !llmArea) return;

  const data = btn._sajuData;
  btn.disabled = true;
  btn.textContent = '해석 생성 중...';
  llmArea.textContent = '  Claude API 호출 중... (약 10~20초 소요)';
  llmArea.classList.remove('hidden');

  try {
    const interpretation = await generateInterpretation({
      ...data,
      apiUrl: LLM_API_URL,
    });
    llmArea.textContent = interpretation;
  } catch (err) {
    llmArea.textContent = `  Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'AI 사주 풀이 생성';
  }
}

function initTestPreview() {
  const toggle = document.getElementById('test-preview-toggle');
  const panel  = document.getElementById('test-preview-panel');
  const arrow  = document.getElementById('test-preview-arrow');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const isHidden = panel.classList.toggle('hidden');
    if (arrow) arrow.style.transform = isHidden ? '' : 'rotate(180deg)';
  });

  // 사주 계산 버튼
  document.getElementById('test-calc-btn')?.addEventListener('click', updateTestPreview);

  // LLM 해석 버튼
  document.getElementById('llm-interpret-btn')?.addEventListener('click', requestLLMInterpretation);
}

// ── Form submission ───────────────────────────────────────────────────────────

function initForm() {
  const form = document.getElementById('saju-form');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const birthDate = document.getElementById('birth-date').value;
    const city      = document.getElementById('birth-city').value.trim();
    const birthTime = document.getElementById('birth-time')?.value || '';
    const zodiac    = document.getElementById('selected-zodiac').value;
    const gender    = document.getElementById('selected-gender').value;

    if (!birthDate) { showToast('Please enter your birth date.'); return; }

    // Validate locally first for instant feedback
    computeFourPillars({ birthDate, zodiac, birthTime, city });

    showLoading();

    const MIN_LOADING_MS = 2000;
    const start = Date.now();

    fetchReading({ birthDate, zodiac, gender, city })
      .catch(() => {
        // API unreachable — fall back to local computation silently
        const pillars  = computeFourPillars({ birthDate, zodiac, birthTime, city });
        const dominant = getDominantElement(pillars);
        return { input: { birthDate, zodiac, gender, city }, pillars, dominant };
      })
      .then(() => {
        const elapsed   = Date.now() - start;
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        setTimeout(() => {
          const params = new URLSearchParams({ date: birthDate, zodiac, city, gender });
          if (birthTime) params.set('time', birthTime);
          window.location.href = `result.html?${params}`;
        }, remaining);
      });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function init() {
  initGenderSelector();
  initMobileNav();
  initCityAutocomplete();
  initSolarTimeCorrection();
  initTestPreview();
  initForm();
}

document.addEventListener('DOMContentLoaded', init);
