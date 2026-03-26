/**
 * result-render.js — Pure HTML builder functions for the result page.
 * No DOM reads/writes. Each function receives data and returns an HTML string.
 */

import {
  ELEMENT_KANJI,
  ELEMENT_COLOR,
  ELEMENT_DETAIL,
  ELEMENT_DESCRIPTIONS,
  getLuckCycles,
} from './saju.js';

// ── Hero section ──────────────────────────────────────────────────────────────

export function buildHeroHtml({ dominant, city, birthDate, gender }) {
  const detail    = ELEMENT_DETAIL[dominant];
  const formatted = new Date(birthDate + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const essence = `${gender === 'female' ? 'Yin' : 'Yang'} ${dominant}`;

  return `
    <div class="lg:col-span-7 space-y-6">
      <span class="text-secondary font-sans uppercase tracking-widest text-sm">Personal Destiny Chart</span>
      <h1 class="font-serif text-5xl md:text-6xl tracking-tight leading-tight text-primary">
        The Path of the<br/><span class="italic">${dominant} ${ELEMENT_KANJI[dominant]}</span>
      </h1>
      <p class="text-lg text-on-surface-variant font-body leading-relaxed max-w-2xl">
        ${ELEMENT_DESCRIPTIONS[dominant]}
        Born in <strong>${city}</strong> on <strong>${formatted}</strong>.
      </p>
    </div>
    <div class="lg:col-span-5 relative">
      <div class="aspect-square bg-surface-container-low rounded-xl overflow-hidden shadow-sm flex items-center justify-center">
        <span class="font-serif text-[12rem] leading-none opacity-10 select-none">${ELEMENT_KANJI[dominant]}</span>
      </div>
      <div class="absolute -bottom-6 -left-6 bg-surface-container-lowest p-6 rounded-lg shadow-xl border border-outline-variant/10 max-w-[220px]">
        <span class="material-symbols-outlined text-secondary block mb-2" style="font-variation-settings:'FILL' 1;">auto_awesome</span>
        <p class="text-xs font-sans uppercase tracking-widest text-on-surface-variant mb-1">Birth Essence</p>
        <p class="font-serif text-xl text-primary italic">${essence}</p>
      </div>
    </div>
  `;
}

// ── Four Pillars section ──────────────────────────────────────────────────────

const PILLAR_META = [
  { label: 'Year Pillar',  role: 'Foundation'    },
  { label: 'Month Pillar', role: 'Environment'   },
  { label: 'Day Pillar',   role: 'Core Identity', self: true },
  { label: 'Hour Pillar',  role: 'Future Legacy' },
];

const PILLAR_META_2 = [
  { label: 'Heavenly Stem', role: 'Yang Force'   },
  { label: 'Heavenly Stem', role: 'Yang Force'   },
  { label: 'Heavenly Stem', role: 'Yang Force', self: true },
  { label: 'Heavenly Stem', role: 'Yang Force'   },
];

function _pillarCard(p, meta) {
  const color  = ELEMENT_COLOR[p.element] ?? 'bg-primary';
  const isSelf = meta.self;
  return `
    <div class="${isSelf
      ? 'bg-surface-container-lowest ring-1 ring-secondary/30 shadow-lg scale-105 z-10'
      : 'bg-surface-container-low hover:bg-surface-container transition-colors'
    } p-8 flex flex-col items-center space-y-6 rounded-lg">
      <span class="text-xs font-sans uppercase tracking-widest ${isSelf ? 'text-secondary font-bold' : 'text-on-surface-variant'}">${meta.label}</span>
      <div class="flex flex-col items-center">
        <div class="w-16 h-16 ${color} rounded-full flex items-center justify-center text-white text-2xl font-serif mb-3 ${isSelf ? 'shadow-md shadow-secondary/20' : ''}">
          ${ELEMENT_KANJI[p.element]}
        </div>
        <p class="font-serif text-2xl text-primary ${isSelf ? 'font-bold' : ''}">${p.element}</p>
        <p class="text-sm text-on-surface-variant italic">${p.stem}${p.branch}</p>
      </div>
      <div class="pt-4 border-t ${isSelf ? 'border-secondary/20' : 'border-outline-variant/20'} w-full text-center">
        <p class="text-[10px] uppercase tracking-[0.2em] ${isSelf ? 'text-secondary' : 'text-on-surface-variant'}">${meta.role}</p>
      </div>
    </div>
  `;
}

export function buildPillarsHtml(pillars) {
  return Object.values(pillars).map((p, i) => _pillarCard(p, PILLAR_META[i])).join('');
}

/** Second row — shows branch (地支) perspective of each pillar */
export function buildPillarsRow2Html(pillars) {
  const BRANCH_ROLES = ['Ancestral Roots', 'Social Sphere', 'Inner Self', 'Hidden Potential'];
  const entries = Object.values(pillars);
  return entries.map((p, i) => {
    const meta = {
      label: 'Earthly Branch',
      role:  BRANCH_ROLES[i],
      self:  i === 2,
    };
    // Show branch element separately for the second row
    const branchP = { ...p, stem: p.branch, branch: p.stem };
    return _pillarCard(branchP, meta);
  }).join('');
}

// ── Destiny detail section ────────────────────────────────────────────────────

export function buildDestinyHtml(dominant) {
  const d = ELEMENT_DETAIL[dominant];
  return `
    <div class="md:col-span-4 bg-surface-container p-8 rounded-xl dancheong-pattern">
      <div class="mb-8">
        <span class="material-symbols-outlined text-secondary text-4xl mb-4 block" style="font-variation-settings:'FILL' 1;">format_quote</span>
        <h3 class="font-serif text-2xl text-primary leading-snug">${d.quote}</h3>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center text-sm border-b border-outline-variant/30 pb-2">
          <span class="text-on-surface-variant">Temperament</span>
          <span class="text-primary font-bold">${d.temperament}</span>
        </div>
        <div class="flex justify-between items-center text-sm border-b border-outline-variant/30 pb-2">
          <span class="text-on-surface-variant">Wealth Affinity</span>
          <span class="text-primary font-bold">${d.wealth}</span>
        </div>
        <div class="flex justify-between items-center text-sm border-b border-outline-variant/30 pb-2">
          <span class="text-on-surface-variant">Key Element</span>
          <span class="text-secondary font-bold">${d.missing}</span>
        </div>
      </div>
    </div>
    <div class="md:col-span-8 space-y-8">
      <div class="inline-flex items-center gap-2 bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
        <span class="material-symbols-outlined text-sm">history_edu</span> Detailed Revelation
      </div>
      <p class="font-serif text-2xl text-primary leading-relaxed">${d.body}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="bg-surface-container-low p-6 border-l-4 border-secondary">
          <h4 class="font-bold text-primary mb-2">Social Harmonics</h4>
          <p class="text-sm text-on-surface-variant">${d.social}</p>
        </div>
        <div class="bg-surface-container-low p-6 border-l-4 border-primary">
          <h4 class="font-bold text-primary mb-2">Health Awareness</h4>
          <p class="text-sm text-on-surface-variant">${d.health}</p>
        </div>
      </div>
    </div>
  `;
}

// ── Luck cycles section ───────────────────────────────────────────────────────

export function buildLuckCyclesHtml(birthYear) {
  const cycles   = getLuckCycles(birthYear);
  const maxH     = 224; // px — matches h-56 (14rem)

  const bars = cycles.map(c => {
    const h      = Math.round(c.intensity * maxH);
    const isPeak = c.peak;
    return `
      <div class="relative group flex flex-col items-center">
        <div class="w-1 absolute bottom-0 ${isPeak ? 'bg-secondary' : 'bg-outline-variant/50'}" style="height:${h}px"></div>
        <div class="w-${isPeak ? 6 : 4} h-${isPeak ? 6 : 4} ${isPeak ? 'bg-secondary shadow-lg shadow-secondary/20' : 'bg-primary'} rounded-full z-10 transition-transform group-hover:scale-125 mb-1" style="margin-bottom:${h + 8}px"></div>
        <p class="text-xs font-bold ${isPeak ? 'text-secondary' : 'text-on-surface-variant'}">${c.ageRange}</p>
        <p class="font-serif text-sm ${isPeak ? 'font-bold' : ''}">${c.label}</p>
      </div>
    `;
  }).join('');

  return `
    <div class="relative overflow-x-auto pb-8">
      <div class="flex min-w-[700px] justify-between items-end h-64 px-12 relative">
        <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          ${Array(4).fill('<div class="border-t border-primary w-full"></div>').join('')}
        </div>
        ${bars}
      </div>
    </div>
  `;
}

// ── Daily wisdom section ──────────────────────────────────────────────────────

export function buildWisdomHtml(dominant) {
  const d = ELEMENT_DETAIL[dominant];
  return `
    <div class="relative z-10 space-y-4">
      <div class="flex items-center gap-2 text-secondary-fixed">
        <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">lightbulb</span>
        <span class="font-sans uppercase tracking-[0.2em] text-sm">Wisdom for Today</span>
      </div>
      <h3 class="font-serif text-3xl md:text-4xl italic">${d.quote}</h3>
      <p class="text-tertiary-fixed-dim max-w-xl text-lg">${d.body.split('.')[0]}. Reflect on this truth today.</p>
    </div>
  `;
}
