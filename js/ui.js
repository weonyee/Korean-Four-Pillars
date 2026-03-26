/**
 * ui.js — DOM interactions and event wiring.
 * Imports pure logic from saju.js and the Modal component.
 * This is the only file that touches the DOM.
 */

import {
  computeFourPillars,
  getDominantElement,
} from './saju.js';

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

// ── Result rendering ──────────────────────────────────────────────────────────
// (Moved to result-render.js — result page handles its own rendering)

// ── Form submission ───────────────────────────────────────────────────────────

function initForm() {
  const form = document.getElementById('saju-form');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const birthDate = document.getElementById('birth-date').value;
    const city      = document.getElementById('birth-city').value.trim();
    const zodiac    = document.getElementById('selected-zodiac').value;
    const gender    = document.getElementById('selected-gender').value;

    if (!birthDate) { showToast('Please enter your birth date.');     return; }
    if (!city)      { showToast('Please enter your city of origin.'); return; }
    if (!zodiac)    { showToast('Please select your zodiac hour.');   return; }

    // Validate pillars are computable before navigating
    computeFourPillars({ birthDate, zodiac });

    showLoading();
    setTimeout(() => {
      const params = new URLSearchParams({ date: birthDate, zodiac, city, gender });
      window.location.href = `result.html?${params}`;
    }, 2200);
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function init() {
  initGenderSelector();
  initZodiacSelector();
  initMobileNav();
  initForm();
}

document.addEventListener('DOMContentLoaded', init);
