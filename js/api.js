/**
 * api.js — Local storage adapter (API-compatible interface).
 *
 * API 서버 없이 프론트만 배포할 때 사용.
 * 함수 시그니처는 API 버전과 동일하므로, 나중에 API 연동 시
 * import 경로만 바꾸면 됩니다.
 *
 * 원본 API 클라이언트: git history 참조 또는 api.remote.js로 복원
 */

import { computeFourPillars, getDominantElement } from './saju.js';

const STORAGE_KEYS = {
  profile:  (uid) => `oracle_profile_${uid}`,
  readings: (uid) => `oracle_readings_${uid}`,
};

// ── Reading ───────────────────────────────────────────────────────────────────

export async function fetchReading(params) {
  const pillars  = computeFourPillars(params);
  const dominant = getDominantElement(pillars);
  return { pillars, dominant, input: params };
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfile(userId) {
  const raw = localStorage.getItem(STORAGE_KEYS.profile(userId));
  return raw ? JSON.parse(raw) : { profile: null };
}

export async function saveProfile(userId, profile) {
  const data = { profile };
  localStorage.setItem(STORAGE_KEYS.profile(userId), JSON.stringify(data));
  return data;
}

// ── Reading history ───────────────────────────────────────────────────────────

function _getReadings(userId) {
  const raw = localStorage.getItem(STORAGE_KEYS.readings(userId));
  return raw ? JSON.parse(raw) : [];
}

function _setReadings(userId, readings) {
  localStorage.setItem(STORAGE_KEYS.readings(userId), JSON.stringify(readings));
}

export async function fetchHistory(userId) {
  return _getReadings(userId);
}

export async function saveReadingToHistory(userId, reading) {
  const readings = _getReadings(userId);
  const entry = { ...reading, readingId: crypto.randomUUID(), createdAt: new Date().toISOString() };
  readings.unshift(entry);
  _setReadings(userId, readings);
  return entry;
}

export async function deleteReadingFromHistory(userId, readingId) {
  const readings = _getReadings(userId).filter(r => r.readingId !== readingId);
  _setReadings(userId, readings);
  return { ok: true };
}
