/**
 * routes/users.js — Profile & reading history endpoints.
 *
 * All routes are prefixed with /api/users (mounted in server.js).
 *
 * Endpoints:
 *   GET    /api/users/:userId/profile          — get profile
 *   PUT    /api/users/:userId/profile          — create or update profile
 *   GET    /api/users/:userId/readings         — list reading history
 *   POST   /api/users/:userId/readings         — save a reading
 *   DELETE /api/users/:userId/readings/:id     — delete a reading
 *
 * Auth note: userId is currently passed as a URL param (no auth middleware).
 * When Cognito is integrated, replace :userId with req.user.sub from JWT.
 */

const express = require('express');
const { getUser, upsertUser, saveReading, getReadings, deleteReading } = require('../db');

const router = express.Router({ mergeParams: true });

// ── Profile ───────────────────────────────────────────────────────────────────

router.get('/:userId/profile', async (req, res) => {
  const user = await getUser(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/:userId/profile', async (req, res) => {
  const { gender, birthDate, zodiac, city } = req.body ?? {};
  const profile = { gender, birthDate, zodiac, city };
  const user = await upsertUser(req.params.userId, profile);
  res.json(user);
});

// ── Readings ──────────────────────────────────────────────────────────────────

router.get('/:userId/readings', async (req, res) => {
  const readings = await getReadings(req.params.userId);
  res.json(readings);
});

router.post('/:userId/readings', async (req, res) => {
  const { input, pillars, dominant, detail } = req.body ?? {};
  if (!input || !pillars || !dominant) {
    return res.status(400).json({ error: 'input, pillars, dominant are required' });
  }
  const record = await saveReading(req.params.userId, { input, pillars, dominant, detail });
  res.status(201).json(record);
});

router.delete('/:userId/readings/:readingId', async (req, res) => {
  const ok = await deleteReading(req.params.userId, req.params.readingId);
  if (!ok) return res.status(404).json({ error: 'Reading not found' });
  res.json({ success: true });
});

module.exports = router;
