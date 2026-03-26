/**
 * profile.js — My Profile page logic.
 * Handles profile view/edit and reading history display.
 *
 * userId: stored in localStorage as 'oracle_user_id'.
 * When Cognito is integrated, replace getOrCreateUserId() with Cognito sub.
 */

import { fetchProfile, saveProfile, fetchHistory, deleteReadingFromHistory } from './api.js';
import { ZODIAC_EMOJIS, ELEMENT_KANJI } from './saju.js';

// ── User identity (temporary — replace with Cognito) ─────────────────────────

function getOrCreateUserId() {
  let id = localStorage.getItem('oracle_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('oracle_user_id', id);
  }
  return id;
}

/*
 * TODO: Cognito 연동 시 아래로 교체
 *
 * import { getCurrentUser } from './auth.js'; // Cognito Amplify wrapper
 *
 * async function getUserId() {
 *   const user = await getCurrentUser();   // CognitoUser 객체
 *   return user.attributes.sub;            // Cognito sub = 고유 userId
 * }
 *
 * 그리고 init() 상단에서:
 *   const USER_ID = await getUserId();
 *
 * 로그인 안 된 경우 login 페이지로 리다이렉트:
 *   if (!USER_ID) { location.href = 'login.html'; return; }
 */

const USER_ID = getOrCreateUserId();

// ── Toast ─────────────────────────────────────────────────────────────────────

const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, isError = true) {
  toastEl.textContent = msg;
  toastEl.style.background = isError ? '#ba1a1a' : '#775a19';
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// ── Profile view/edit ─────────────────────────────────────────────────────────

const editBtn    = document.getElementById('edit-btn');
const cancelBtn  = document.getElementById('cancel-btn');
const profileView = document.getElementById('profile-view');
const profileForm = document.getElementById('profile-form');
const profileFields = document.getElementById('profile-fields');
const profileEmpty  = document.getElementById('profile-empty');

function showView(profile) {
  profileForm.classList.add('hidden');
  profileView.classList.remove('hidden');

  if (!profile) {
    profileEmpty.classList.remove('hidden');
    profileFields.classList.add('hidden');
    return;
  }

  profileEmpty.classList.add('hidden');
  profileFields.classList.remove('hidden');

  const emoji = ZODIAC_EMOJIS[profile.zodiac] || '';
  document.getElementById('view-gender').textContent    = profile.gender === 'female' ? 'Female' : 'Male';
  document.getElementById('view-birthdate').textContent = profile.birthDate
    ? new Date(profile.birthDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  document.getElementById('view-zodiac').textContent    = profile.zodiac ? `${emoji} ${profile.zodiac}` : '—';
  document.getElementById('view-city').textContent      = profile.city || '—';
}

function showEdit(profile) {
  profileView.classList.add('hidden');
  profileForm.classList.remove('hidden');

  if (profile) {
    document.getElementById('edit-gender').value    = profile.gender    || 'male';
    document.getElementById('edit-birthdate').value = profile.birthDate || '';
    document.getElementById('edit-zodiac').value    = profile.zodiac    || '';
    document.getElementById('edit-city').value      = profile.city      || '';
  }
}

editBtn.addEventListener('click', () => showEdit(currentProfile));
cancelBtn.addEventListener('click', () => showView(currentProfile));

profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  const profile = {
    gender:    document.getElementById('edit-gender').value,
    birthDate: document.getElementById('edit-birthdate').value,
    zodiac:    document.getElementById('edit-zodiac').value,
    city:      document.getElementById('edit-city').value.trim(),
  };
  try {
    const saved = await saveProfile(USER_ID, profile);
    currentProfile = saved.profile;
    showView(currentProfile);
    showToast('Profile saved', false);
  } catch {
    showToast('Failed to save profile');
  }
});

// ── History ───────────────────────────────────────────────────────────────────

function buildHistoryCard(reading) {
  const date      = new Date(reading.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const emoji     = ZODIAC_EMOJIS[reading.input?.zodiac] || '🔮';
  const kanji     = ELEMENT_KANJI[reading.dominant] || '';
  const city      = reading.input?.city ? ` · ${reading.input.city}` : '';

  const card = document.createElement('div');
  card.className = 'flex items-center gap-4 bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 hover:bg-surface-container transition-colors group';
  card.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0 font-serif text-lg text-secondary">
      ${kanji}
    </div>
    <div class="flex-1 min-w-0">
      <p class="font-sans font-bold text-sm text-primary">${reading.dominant} · ${emoji} ${reading.input?.zodiac || ''}</p>
      <p class="font-sans text-xs text-on-surface-variant mt-0.5">${date}${city}</p>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <a href="result.html?date=${reading.input?.birthDate}&zodiac=${reading.input?.zodiac}&city=${encodeURIComponent(reading.input?.city || '')}&gender=${reading.input?.gender || 'male'}"
         class="p-2 rounded-full hover:bg-surface-container-high transition-colors" aria-label="View reading">
        <span class="material-symbols-outlined text-sm text-on-surface-variant">open_in_new</span>
      </a>
      <button data-id="${reading.readingId}" class="delete-btn p-2 rounded-full hover:bg-error-container transition-colors" aria-label="Delete">
        <span class="material-symbols-outlined text-sm text-on-surface-variant hover:text-error">delete</span>
      </button>
    </div>
  `;

  card.querySelector('.delete-btn').addEventListener('click', async () => {
    try {
      await deleteReadingFromHistory(USER_ID, reading.readingId);
      card.remove();
      updateHistoryCount();
    } catch {
      showToast('Failed to delete reading');
    }
  });

  return card;
}

function updateHistoryCount() {
  const count = document.getElementById('history-list').children.length;
  document.getElementById('history-count').textContent = count ? `${count} reading${count > 1 ? 's' : ''}` : '';
  document.getElementById('history-empty').classList.toggle('hidden', count > 0);
}

// ── Init ──────────────────────────────────────────────────────────────────────

let currentProfile = null;

async function init() {
  // Load profile
  try {
    const user = await fetchProfile(USER_ID);
    currentProfile = user?.profile ?? null;
  } catch {
    currentProfile = null;
  }
  showView(currentProfile);

  // Load history
  try {
    const readings = await fetchHistory(USER_ID);
    const list = document.getElementById('history-list');
    readings.forEach(r => list.appendChild(buildHistoryCard(r)));
    updateHistoryCount();
  } catch {
    document.getElementById('history-empty').classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', init);
