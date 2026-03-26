/**
 * result.js — Entry point for result.html.
 * Reads query params, computes pillars, delegates rendering to result-render.js.
 */

import { computeFourPillars, getDominantElement } from './saju.js';
import {
  buildHeroHtml,
  buildPillarsHtml,
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

function init() {
  const params   = getParams();
  const pillars  = computeFourPillars(params);
  const dominant = getDominantElement(pillars);
  const birthYear = new Date(params.birthDate + 'T12:00:00').getFullYear();

  inject('result-hero',    buildHeroHtml({ ...params, dominant }));
  inject('result-pillars', buildPillarsHtml(pillars));
  inject('result-destiny', buildDestinyHtml(dominant));
  inject('result-luck',    buildLuckCyclesHtml(birthYear));
  inject('result-wisdom',  buildWisdomHtml(dominant));
}

document.addEventListener('DOMContentLoaded', init);
