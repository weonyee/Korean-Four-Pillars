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

const { randomUUID } = require('crypto');

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
 * 예시 (getUser):
 *   const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
 *   const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
 *
 *   async function getUser(userId) {
 *     const { Item } = await client.send(new GetCommand({
 *       TableName: process.env.USERS_TABLE,
 *       Key: { userId },
 *     }));
 *     return Item ?? null;
 *   }
 *
 * 환경변수 (.env):
 *   AWS_REGION=ap-northeast-2
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   USERS_TABLE=oracle-users
 *   READINGS_TABLE=oracle-readings
 */

// ── Users ─────────────────────────────────────────────────────────────────────

async function getUser(userId) {
  return store.users[userId] ?? null;
}

async function upsertUser(userId, profile) {
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

async function saveReading(userId, readingData) {
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

async function getReadings(userId, limit = 20) {
  return Object.values(store.readings)
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function deleteReading(userId, readingId) {
  const record = store.readings[readingId];
  if (!record || record.userId !== userId) return false;
  delete store.readings[readingId];
  return true;
}

module.exports = { getUser, upsertUser, saveReading, getReadings, deleteReading };
