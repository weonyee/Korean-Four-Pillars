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
  const birthTime = document.getElementById('birth-time')?.value || '';
  const gender    = document.getElementById('selected-gender')?.value || 'male';

  if (!birthDate || !zodiac) {
    output.textContent = '  생년월일과 시간대를 선택하면 사주가 여기에 표시됩니다.';
    return;
  }

  try {
    const pillars  = computeFourPillars({ birthDate, zodiac, birthTime, city });
    const dominant = getDominantElement(pillars);
    const date     = new Date(birthDate + 'T12:00:00');
    const sajuYear = getSajuYear(date);
    const sajuMon  = getSajuMonth(date);

    const lines = [];
    const hr = '\u2500'.repeat(52);

    lines.push(hr);
    lines.push(`  ${birthDate} | ${gender === 'male' ? '남' : '여'} | ${city || '도시 미입력'}`);
    lines.push(`  사주연도: ${sajuYear} (입춘 기준) | 사주월: ${sajuMon}월`);
    lines.push(hr);

    // 진태양시 보정
    if (pillars.solarTimeCorrection) {
      const c = pillars.solarTimeCorrection;
      const sign = c.correctionMinutes >= 0 ? '+' : '';
      const ch = String(c.correctedHour).padStart(2, '0');
      const cm = String(c.correctedMinute).padStart(2, '0');
      lines.push('');
      lines.push('  진태양시 보정');
      lines.push(`    입력: ${c.originalTime} -> 보정: ${ch}:${cm} (${sign}${c.correctionMinutes}분)`);
      if (c.originalZodiac && c.originalZodiac !== c.correctedZodiac) {
        lines.push(`    시진 변경: ${c.originalZodiac} -> ${c.correctedZodiac}`);
      }
    }

    // 사주 테이블
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

    // 오행
    lines.push('');
    const stemEls = [y.stemEl, m.stemEl, d.stemEl];
    const branchEls = [y.branchEl, m.branchEl, d.branchEl];
    if (hasHour) { stemEls.push(h.stemEl); branchEls.push(h.branchEl); }
    lines.push(`  천간 오행: ${stemEls.map(e => ELEMENT_KO[e]).join(' ')}`);
    lines.push(`  지지 오행: ${branchEls.map(e => ELEMENT_KO[e]).join(' ')}`);
    lines.push('');
    lines.push(`  일간(Day Master): ${d.stem} (${ELEMENT_KO[d.stemEl]})`);
    lines.push(`  주도 오행: ${ELEMENT_KO[dominant]}`);

    // 오행 분포 (천간+지지)
    const elCount = {};
    const activePillars = hasHour ? [y, m, d, h] : [y, m, d];
    activePillars.forEach(p => {
      elCount[p.stemEl] = (elCount[p.stemEl] || 0) + 1;
      elCount[p.branchEl] = (elCount[p.branchEl] || 0) + 1;
    });
    lines.push('');
    lines.push('  오행 분포 (천간+지지):');
    for (const [el, cnt] of Object.entries(elCount).sort((a, b) => b[1] - a[1])) {
      const bar = '\u2588'.repeat(cnt) + '\u2591'.repeat(8 - cnt);
      lines.push(`    ${ELEMENT_KO[el].padEnd(6)} ${bar} ${cnt}`);
    }

    output.textContent = lines.join('\n');
  } catch (err) {
    output.textContent = `  Error: ${err.message}`;
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
    if (!isHidden) updateTestPreview();
  });

  document.getElementById('birth-date')?.addEventListener('change', updateTestPreview);
  document.getElementById('birth-time')?.addEventListener('change', updateTestPreview);
  document.getElementById('birth-city')?.addEventListener('change', updateTestPreview);
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
