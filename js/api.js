/**
 * api.js — Frontend API client.
 * Single place to change the base URL when deploying.
 */

const BASE_URL = 'http://localhost:3000';

/**
 * Request a Saju reading from the API.
 * Falls back to local computation if the API is unreachable.
 *
 * @param {{ birthDate: string, zodiac: string, gender: string, city: string }} params
 * @returns {Promise<object>} reading
 */
export async function fetchReading(params) {
  const res = await fetch(`${BASE_URL}/api/reading`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}
