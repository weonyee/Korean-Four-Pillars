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

function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    birthDate: p.get('date')   || '',
    zodiac:    p.get('zodiac') || 'RAT',
    city:      p.get('city')   || 'Unknown',
    gender:    p.get('gender') || 'male',
  };
}

function inject(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function render(reading) {
  const { pillars, dominant, input } = reading;
  const birthYear = new Date(input.birthDate + 'T12:00:00').getFullYear();

  inject('result-hero',      buildHeroHtml({ ...input, dominant }));
  inject('result-pillars',   buildPillarsHtml(pillars));
  inject('result-pillars-2', buildPillarsRow2Html(pillars));
  inject('result-destiny',   buildDestinyHtml(dominant));
  inject('result-luck',    buildLuckCyclesHtml(birthYear));
  inject('result-wisdom',  buildWisdomHtml(dominant));
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
