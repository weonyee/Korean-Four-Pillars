/**
 * api.js — Frontend API client.
 * Single place to change the base URL when deploying.
 */

const BASE_URL = 'http://localhost:3000';

async function _request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function fetchReading(params) {
  return _request('/api/reading', { method: 'POST', body: JSON.stringify(params) });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfile(userId) {
  return _request(`/api/users/${userId}/profile`);
}

export async function saveProfile(userId, profile) {
  return _request(`/api/users/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// ── Reading history ───────────────────────────────────────────────────────────

export async function fetchHistory(userId) {
  return _request(`/api/users/${userId}/readings`);
}

export async function saveReadingToHistory(userId, reading) {
  return _request(`/api/users/${userId}/readings`, {
    method: 'POST',
    body: JSON.stringify(reading),
  });
}

export async function deleteReadingFromHistory(userId, readingId) {
  return _request(`/api/users/${userId}/readings/${readingId}`, { method: 'DELETE' });
}
