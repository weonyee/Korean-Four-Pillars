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
    <div class="lg:col-span-5 relative order-1 lg:order-2">
      <div class="aspect-square bg-surface-container-low rounded-xl overflow-hidden shadow-sm flex items-center justify-center">
        <span class="font-serif text-[12rem] leading-none opacity-10 select-none">${ELEMENT_KANJI[dominant]}</span>
      </div>
      <div class="absolute -bottom-6 -left-6 bg-surface-container-lowest p-4 rounded-lg shadow-xl border border-outline-variant/10 max-w-[180px]">
        <span class="material-symbols-outlined text-secondary block mb-1 text-sm" style="font-variation-settings:'FILL' 1;">auto_awesome</span>
        <p class="text-[10px] font-sans uppercase tracking-widest text-on-surface-variant mb-0.5">Birth Essence</p>
        <p class="font-serif text-base text-primary italic">${essence}</p>
      </div>
    </div>
    <div class="lg:col-span-7 space-y-4 order-2 lg:order-1 pt-8 lg:pt-0">
      <span class="text-secondary font-sans uppercase tracking-widest text-xs">Personal Destiny Chart</span>
      <h1 class="font-serif text-3xl md:text-4xl tracking-tight leading-tight text-primary">
        <span class="text-primary/50">The Path of the</span><br/><span class="italic">${dominant} ${ELEMENT_KANJI[dominant]}</span>
      </h1>
      <p class="text-base text-on-surface-variant font-body leading-relaxed">
        ${ELEMENT_DESCRIPTIONS[dominant]}
        ${city ? `Born in <strong>${city}</strong> on` : 'Born on'} <strong>${formatted}</strong>.
      </p>
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
    } p-3 md:p-6 flex flex-col items-center space-y-2 md:space-y-4 rounded-lg">
      <span class="text-[9px] md:text-xs font-sans uppercase tracking-widest ${isSelf ? 'text-secondary font-bold' : 'text-on-surface-variant'} text-center">${meta.label}</span>
      <div class="flex flex-col items-center">
        <div class="w-10 h-10 md:w-14 md:h-14 ${color} rounded-full flex items-center justify-center text-white text-lg md:text-2xl font-serif mb-2 ${isSelf ? 'shadow-md shadow-secondary/20' : ''}">
          ${ELEMENT_KANJI[p.element]}
        </div>
        <p class="font-serif text-sm md:text-xl text-primary ${isSelf ? 'font-bold' : ''}">${p.element}</p>
        <p class="text-[10px] md:text-sm text-on-surface-variant italic">${p.stem}${p.branch}</p>
      </div>
      <div class="pt-2 border-t ${isSelf ? 'border-secondary/20' : 'border-outline-variant/20'} w-full text-center">
        <p class="text-[8px] md:text-[10px] uppercase tracking-[0.15em] ${isSelf ? 'text-secondary' : 'text-on-surface-variant'}">${meta.role}</p>
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
      <p class="font-serif text-lg text-primary leading-relaxed">${d.body}</p>
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
  const cycles = getLuckCycles(birthYear);
  const maxH   = 160; // px

  const bars = cycles.map(c => {
    const h      = Math.round(c.intensity * maxH);
    const isPeak = c.peak;
    return `
      <div class="relative group flex flex-col items-center flex-1">
        <div class="w-px absolute bottom-8 ${isPeak ? 'bg-secondary' : 'bg-outline-variant/50'}" style="height:${h}px"></div>
        <div class="w-${isPeak ? 3 : 2} h-${isPeak ? 3 : 2} md:w-${isPeak ? 6 : 4} md:h-${isPeak ? 6 : 4} ${isPeak ? 'bg-secondary shadow-lg shadow-secondary/20' : 'bg-primary'} rounded-full z-10 transition-transform group-hover:scale-125 absolute" style="bottom:${h + 32}px"></div>
        <div class="absolute bottom-0 text-center w-full">
          <p class="text-[9px] md:text-xs font-bold ${isPeak ? 'text-secondary' : 'text-on-surface-variant'} leading-tight">${c.ageRange}</p>
          <p class="font-serif text-[10px] md:text-sm ${isPeak ? 'font-bold' : ''} leading-tight">${c.label}</p>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="relative w-full">
      <div class="flex justify-between items-end w-full px-2" style="height:${maxH + 80}px">
        <div class="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none opacity-10" style="height:${maxH + 16}px">
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
    <div class="relative z-10 space-y-3">
      <div class="flex items-center gap-2 text-secondary-fixed">
        <span class="material-symbols-outlined text-sm" style="font-variation-settings:'FILL' 1;">lightbulb</span>
        <span class="font-sans uppercase tracking-[0.2em] text-xs">Wisdom for Today</span>
      </div>
      <h3 class="font-serif text-xl md:text-3xl italic">${d.quote}</h3>
      <p class="text-tertiary-fixed-dim text-sm md:text-base">${d.body.split('.')[0]}. Reflect on this truth today.</p>
    </div>
  `;
}
