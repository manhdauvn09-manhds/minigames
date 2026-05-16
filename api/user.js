/**
 * POST /api/user
 *  Body: { userId, name, email?, type }
 *  Upserts a user record. Optional Google token verification (Authorization: Bearer <id_token>).
 */
import { getPool, jsonResponse, setCors, verifyGoogleToken, getBearer } from './_db.js';

function clean(s, max) { return String(s == null ? '' : s).slice(0, max).replace(/[ -]/g, ''); }

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    return jsonResponse(res, 405, { error: 'method_not_allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  let userId = clean(body.userId, 64);
  let name   = clean(body.name, 30);
  let email  = body.email ? clean(body.email, 120) : null;
  let type   = body.type === 'google' ? 'google' : 'guest';

  if (!userId || !name) return jsonResponse(res, 400, { error: 'invalid_user' });

  const token = getBearer(req);
  if (token) {
    const pl = await verifyGoogleToken(token);
    if (pl && ('google_' + pl.sub) === userId) {
      email = pl.email || email; name = pl.name || name; type = 'google';
    } else if (token) {
      return jsonResponse(res, 401, { error: 'invalid_token' });
    }
  } else if (userId.startsWith('google_')) {
    return jsonResponse(res, 401, { error: 'token_required' });
  }

  try {
    const pool = (await import('./_db.js')).getPool();
    await pool.execute(
      `INSERT INTO users (user_id, name, email, type, last_seen)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name), email = COALESCE(VALUES(email), email), last_seen = NOW()`,
      [userId, name, email, type]
    );
    return jsonResponse(res, 200, { ok: true });
  } catch (e) {
    console.error('[api/user] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'db_error' });
  }
}
