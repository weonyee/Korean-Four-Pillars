/**
 * db.js — Data access abstraction layer.
 *
 * Currently uses in-memory store (data resets on server restart).
 * To switch to DynamoDB, replace each function body with AWS SDK calls
 * while keeping the same function signatures.
 *
 * Tables (logical):
 *   users      — { userId, profile: { gender, birthDate, zodiac, city }, createdAt }
 *   readings   — { readingId, userId, createdAt, input, pillars, dominant, detail }
 */

import { randomUUID } from 'crypto';

// ── In-memory store ───────────────────────────────────────────────────────────
const store = {
  users:    {},   // keyed by userId
  readings: {},   // keyed by readingId; each has userId for lookup
};

/*
 * TODO: DynamoDB 교체 시 각 함수 본문을 AWS SDK 호출로 대체
 *
 * 필요한 패키지:
 *   npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 *
 * 테이블 구성 (DynamoDB):
 *   Users    — PK: userId (String)
 *   Readings — PK: userId (String), SK: readingId (String)
 *              GSI 불필요 — userId로 query 가능
 *
 * 환경변수 (.env):
 *   AWS_REGION=ap-northeast-2
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   USERS_TABLE=oracle-users
 *   READINGS_TABLE=oracle-readings
 */

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUser(userId) {
  return store.users[userId] ?? null;
}

export async function upsertUser(userId, profile) {
  const existing = store.users[userId];
  store.users[userId] = {
    userId,
    profile,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return store.users[userId];
}

// ── Readings ──────────────────────────────────────────────────────────────────

export async function saveReading(userId, readingData) {
  const readingId = randomUUID();
  const record = {
    readingId,
    userId,
    createdAt: new Date().toISOString(),
    ...readingData,
  };
  store.readings[readingId] = record;
  return record;
}

export async function getReadings(userId, limit = 20) {
  return Object.values(store.readings)
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

export async function deleteReading(userId, readingId) {
  const record = store.readings[readingId];
  if (!record || record.userId !== userId) return false;
  delete store.readings[readingId];
  return true;
}
