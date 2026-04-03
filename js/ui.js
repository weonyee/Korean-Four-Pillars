/**
 * ui.js — DOM interactions and event wiring.
 * Imports pure logic from saju.js and the Modal component.
 * This is the only file that touches the DOM.
 */

import {
  computeFourPillars,
  getDominantElement,
} from './saju.js';
import { fetchReading } from './api.js';
import { initCitySearch } from './city-search.js';
import { correctBirthTime, getCityCoords } from './solar-time.js';

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
    });
  });
}

// ── Zodiac selector ───────────────────────────────────────────────────────────

function initZodiacSelector() {
  const buttons = document.querySelectorAll('.zodiac-btn');
  const hidden  = document.getElementById('selected-zodiac');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      hidden.value = btn.dataset.zodiac;
    });
  });
}

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
}

function initSolarTimeCorrection() {
  const timeInput = document.getElementById('birth-time');
  const cityInput = document.getElementById('birth-city');
  const dateInput = document.getElementById('birth-date');

  timeInput?.addEventListener('change', updateSolarTimeHint);
  cityInput?.addEventListener('change', updateSolarTimeHint);
  dateInput?.addEventListener('change', updateSolarTimeHint);
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

    if (!birthDate) { showToast('Please enter your birth date.');     return; }
    if (!zodiac)    { showToast('Please select your zodiac hour.');   return; }

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
  initZodiacSelector();
  initMobileNav();
  initCityAutocomplete();
  initSolarTimeCorrection();
  initForm();
}

document.addEventListener('DOMContentLoaded', init);
