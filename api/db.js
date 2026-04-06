/**
 * db.js — Data access layer (DynamoDB).
 *
 * Tables:
 *   saju-users     — PK: userId (S)
 *   saju-readings  — PK: userId (S), SK: readingId (S)
 *   saju-templates — PK: type (S),   SK: key (S)
 *
 * 환경변수:
 *   AWS_REGION          (default: ap-northeast-2)
 *   USERS_TABLE         (default: saju-users)
 *   READINGS_TABLE      (default: saju-readings)
 *   TEMPLATES_TABLE     (default: saju-templates)
 */

import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// ── DynamoDB 클라이언트 ──────────────────────────────────────────────────────

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-2' });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE     = process.env.USERS_TABLE     || 'saju-users';
const READINGS_TABLE  = process.env.READINGS_TABLE  || 'saju-readings';
const TEMPLATES_TABLE = process.env.TEMPLATES_TABLE || 'saju-templates';

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUser(userId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));
  return Item ?? null;
}

export async function upsertUser(userId, profile) {
  const existing = await getUser(userId);
  const item = {
    userId,
    profile,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({
    TableName: USERS_TABLE,
    Item: item,
  }));
  return item;
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
  await docClient.send(new PutCommand({
    TableName: READINGS_TABLE,
    Item: record,
  }));
  return record;
}

export async function getReadings(userId, limit = 20) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: READINGS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,   // 최신순
    Limit: limit,
  }));
  return Items ?? [];
}

export async function deleteReading(userId, readingId) {
  await docClient.send(new DeleteCommand({
    TableName: READINGS_TABLE,
    Key: { userId, readingId },
    ConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }));
  return true;
}

// ── Templates (사주 해석 템플릿) ─────────────────────────────────────────────

/**
 * 템플릿 저장/업데이트.
 * @param {string} type — 'day_stem' | 'ten_god' | 'structure'
 * @param {string} key  — e.g. '甲', '비견', '식신격'
 * @param {object} content — 템플릿 내용
 */
export async function upsertTemplate(type, key, content) {
  const item = { type, key, content, updatedAt: new Date().toISOString() };
  await docClient.send(new PutCommand({
    TableName: TEMPLATES_TABLE,
    Item: item,
  }));
  return item;
}

/**
 * 단일 템플릿 조회.
 * @param {string} type
 * @param {string} key
 */
export async function getTemplate(type, key) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TEMPLATES_TABLE,
    Key: { type, key },
  }));
  return Item ?? null;
}

/**
 * 특정 type의 모든 템플릿 조회.
 * @param {string} type — 'day_stem' | 'ten_god' | 'structure'
 */
export async function getTemplatesByType(type) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TEMPLATES_TABLE,
    KeyConditionExpression: '#t = :type',
    ExpressionAttributeNames: { '#t': 'type' },
    ExpressionAttributeValues: { ':type': type },
  }));
  return Items ?? [];
}

/**
 * 사주 분석에 필요한 모든 템플릿을 한 번에 조회합니다.
 * @param {string} dayStem    — 일간 (예: '甲')
 * @param {string} structure  — 격국 (예: '식신격')
 * @param {string[]} tenGods  — 사주에 나타난 십신 목록
 * @returns {{ dayStem, structure, tenGods }}
 */
export async function getReadingTemplates(dayStem, structure, tenGods) {
  const [ds, st, ...tgItems] = await Promise.all([
    getTemplate('day_stem', dayStem),
    getTemplate('structure', structure),
    ...[...new Set(tenGods)].map(tg => getTemplate('ten_god', tg).then(item => ({ key: tg, item }))),
  ]);
  const tgResults = {};
  for (const { key, item } of tgItems) {
    tgResults[key] = item;
  }
  return { dayStem: ds, structure: st, tenGods: tgResults };
}

/**
 * data/saju-templates.js의 데이터를 DynamoDB에 시딩합니다.
 * BatchWrite로 25개씩 묶어서 전송합니다.
 */
export async function seedTemplates({
  DAY_STEM_TEMPLATES = {},
  TEN_GOD_TEMPLATES = {},
  STRUCTURE_TEMPLATES = {},
  DAY_PILLAR_TEMPLATES = {},
  TEN_GOD_POSITION_TEMPLATES = {},
  ELEMENT_BALANCE_TEMPLATES = {},
  SINSAL_TEMPLATES = {},
  RELATION_TEMPLATES = {},
  NAYIN_TEMPLATES = {},
  YONGSIN_TEMPLATES = {},
  GTBG_TEMPLATES = {},
  SIPSIN_PATTERN_TEMPLATES = {},
  TWELVE_STAGES_TEMPLATES = {},
  STEM_COMBO_TEMPLATES = {},
  GENDER_TEN_GOD_TEMPLATES = {},
  GENDER_SINSAL_TEMPLATES = {},
  GENDER_POSITION_TEMPLATES = {},
}) {
  const items = [];
  const now = new Date().toISOString();

  const typeMap = {
    day_stem: DAY_STEM_TEMPLATES,
    ten_god: TEN_GOD_TEMPLATES,
    structure: STRUCTURE_TEMPLATES,
    day_pillar: DAY_PILLAR_TEMPLATES,
    ten_god_position: TEN_GOD_POSITION_TEMPLATES,
    element_balance: ELEMENT_BALANCE_TEMPLATES,
    sinsal: SINSAL_TEMPLATES,
    relation: RELATION_TEMPLATES,
    nayin: NAYIN_TEMPLATES,
    yongsin: YONGSIN_TEMPLATES,
    gtbg: GTBG_TEMPLATES,
    sipsin_pattern: SIPSIN_PATTERN_TEMPLATES,
    twelve_stages: TWELVE_STAGES_TEMPLATES,
    stem_combo: STEM_COMBO_TEMPLATES,
    gender_ten_god: GENDER_TEN_GOD_TEMPLATES,
    gender_sinsal: GENDER_SINSAL_TEMPLATES,
    gender_position: GENDER_POSITION_TEMPLATES,
  };

  for (const [type, templates] of Object.entries(typeMap)) {
    for (const [key, content] of Object.entries(templates)) {
      items.push({ type, key, content, updatedAt: now });
    }
  }

  // BatchWrite는 최대 25개씩
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [TEMPLATES_TABLE]: batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    }));
  }

  return items.length;
}
