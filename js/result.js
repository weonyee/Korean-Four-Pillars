/**
 * result.js — Entry point for result.html.
 * Fetches reading from API, falls back to local computation if unavailable.
 */

import { computeFourPillars, getDominantElement } from './saju.js';
import { fetchReading } from './api.js';
import {
  buildHeroHtml,
  buildPillarsHtml,
  buildPillarsRow2Html,
  buildDestinyHtml,
  buildLuckCyclesHtml,
  buildWisdomHtml,
} from './result-render.js';

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

document.addEventListener('DOMContentLoaded', init);
