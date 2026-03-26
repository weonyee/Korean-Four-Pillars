/**
 * api/server.js — Minimal Express API for Saju readings.
 *
 * Endpoints:
 *   POST /api/reading   { birthDate, zodiac, gender, city } → reading object
 *   GET  /api/health    → { status: "ok" }
 *
 * Run: node server.js
 */

const express = require('express');
const cors    = require('cors');
const { computeReading } = require('./saju');
const usersRouter = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/users', usersRouter);

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_ZODIACS = [
  'RAT','OX','TIGER','RABBIT','DRAGON','SNAKE',
  'HORSE','SHEEP','MONKEY','ROOSTER','DOG','PIG',
];

function validateReading({ birthDate, zodiac, gender, city }) {
  const errors = [];
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))
    errors.push('birthDate must be YYYY-MM-DD');
  if (!zodiac || !VALID_ZODIACS.includes(zodiac.toUpperCase()))
    errors.push(`zodiac must be one of: ${VALID_ZODIACS.join(', ')}`);
  if (!gender || !['male','female'].includes(gender.toLowerCase()))
    errors.push('gender must be "male" or "female"');
  if (!city || typeof city !== 'string' || city.trim().length === 0)
    errors.push('city is required');  // optional — kept for future use, not enforced
  return errors;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/reading', (req, res) => {
  const { birthDate, zodiac, gender, city } = req.body ?? {};

  const errors = validateReading({ birthDate, zodiac, gender, city });
  const filteredErrors = errors.filter(e => !e.includes('city'));
  if (filteredErrors.length) {
    return res.status(400).json({ error: 'Invalid input', details: filteredErrors });
  }

  try {
    const reading = computeReading({
      birthDate,
      zodiac:  zodiac.toUpperCase(),
      gender:  gender.toLowerCase(),
      city:    city.trim(),
    });
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: 'Computation failed', message: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Oracle API running → http://localhost:${PORT}`);
});
