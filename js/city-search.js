/**
 * city-search.js — Instant local city autocomplete.
 * Filters bundled city list client-side for zero-latency results.
 * Falls back to Nominatim for queries with no local matches.
 */

import { CITIES } from './cities-data.js';

const MAX_RESULTS    = 6;
const NOMINATIM_URL  = 'https://nominatim.openstreetmap.org/search';
const FALLBACK_MS    = 400; // debounce for Nominatim fallback only

// ── Local search ──────────────────────────────────────────────────────────────

function searchLocal(query) {
  const q = query.toLowerCase();
  return CITIES
    .filter(c => c.toLowerCase().startsWith(q) || c.toLowerCase().includes(`, ${q}`))
    .concat(CITIES.filter(c => {
      const lower = c.toLowerCase();
      return !lower.startsWith(q) && !lower.includes(`, ${q}`) && lower.includes(q);
    }))
    .slice(0, MAX_RESULTS)
    .map(label => {
      const [city, country = ''] = label.split(', ');
      return { label, city, country };
    });
}

// ── Nominatim fallback ────────────────────────────────────────────────────────

async function searchNominatim(query) {
  const params = new URLSearchParams({
    q: query, format: 'json', limit: MAX_RESULTS,
    featuretype: 'city', addressdetails: 1,
  });
  const res  = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();

  const seen = new Set();
  return data.reduce((acc, item) => {
    const addr    = item.address ?? {};
    const city    = addr.city || addr.town || addr.village || item.name;
    const country = addr.country || '';
    const label   = country ? `${city}, ${country}` : city;
    if (!seen.has(label) && city) { seen.add(label); acc.push({ label, city, country }); }
    return acc;
  }, []);
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

function createDropdown() {
  const el = document.createElement('ul');
  el.id        = 'city-dropdown';
  el.setAttribute('role', 'listbox');
  el.className = 'absolute left-0 right-0 top-full mt-1 z-50 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-xl overflow-hidden hidden';
  return el;
}

function renderItems(dropdown, items, onSelect) {
  dropdown.innerHTML = '';
  if (!items.length) { dropdown.classList.add('hidden'); return; }

  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.index = i;
    li.className = 'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-container transition-colors';
    li.innerHTML = `
      <span class="material-symbols-outlined text-sm text-on-surface-variant">location_on</span>
      <span class="font-sans text-sm text-primary">${item.label}</span>
    `;
    li.addEventListener('mousedown', e => { e.preventDefault(); onSelect(item); });
    dropdown.appendChild(li);
  });

  dropdown.classList.remove('hidden');
}

// ── Keyboard nav ──────────────────────────────────────────────────────────────

function handleKeyNav(e, dropdown, onSelect) {
  if (dropdown.classList.contains('hidden')) return;
  const items = [...dropdown.querySelectorAll('li')];
  const cur   = dropdown.querySelector('li[aria-selected="true"]');
  const idx   = cur ? parseInt(cur.dataset.index) : -1;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    items.forEach(li => li.removeAttribute('aria-selected'));
    const next = items[Math.min(idx + 1, items.length - 1)];
    next?.setAttribute('aria-selected', 'true');
    next?.classList.add('bg-surface-container');
    cur?.classList.remove('bg-surface-container');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items.forEach(li => li.removeAttribute('aria-selected'));
    const prev = items[Math.max(idx - 1, 0)];
    prev?.setAttribute('aria-selected', 'true');
    prev?.classList.add('bg-surface-container');
    cur?.classList.remove('bg-surface-container');
  } else if (e.key === 'Enter') {
    const sel = dropdown.querySelector('li[aria-selected="true"]');
    if (sel) { e.preventDefault(); sel.dispatchEvent(new MouseEvent('mousedown')); }
  } else if (e.key === 'Escape') {
    dropdown.classList.add('hidden');
  }
}

// ── Debounce (for Nominatim only) ─────────────────────────────────────────────

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ── Public initializer ────────────────────────────────────────────────────────

export function initCitySearch(inputEl, onSelect) {
  inputEl.parentElement.style.position = 'relative';
  const dropdown = createDropdown();
  inputEl.parentElement.appendChild(dropdown);

  let nominatimTimer;

  const handleSelect = item => {
    inputEl.value = item.label;
    dropdown.classList.add('hidden');
    onSelect(item);
  };

  // Nominatim fallback — only fires if local returns nothing
  const nominatimFallback = debounce(async query => {
    try {
      const results = await searchNominatim(query);
      if (results.length) renderItems(dropdown, results, handleSelect);
    } catch { /* silent */ }
  }, FALLBACK_MS);

  inputEl.addEventListener('input', () => {
    const query = inputEl.value.trim();
    if (query.length < 1) { dropdown.classList.add('hidden'); return; }

    // Instant local results
    const local = searchLocal(query);
    renderItems(dropdown, local, handleSelect);

    // If local has no results, try Nominatim after debounce
    if (!local.length) nominatimFallback(query);
    else clearTimeout(nominatimTimer);
  });

  inputEl.addEventListener('keydown', e => handleKeyNav(e, dropdown, handleSelect));
  inputEl.addEventListener('blur',    () => setTimeout(() => dropdown.classList.add('hidden'), 150));
  inputEl.addEventListener('focus',   () => {
    if (inputEl.value.trim().length >= 1) inputEl.dispatchEvent(new Event('input'));
  });
}
