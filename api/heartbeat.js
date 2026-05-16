/**
 * POST /api/heartbeat
 *  Body: { game, userId }
 *  Upserts a presence row so the user is counted as "online" for the game.
 *  Called every 30s by the running game.
 */
import { getPool, jsonResponse, setCors, GAMES } from './_db.js';

function clean(s, max) { return String(s == null ? '' : s).slice(0, max).replace(/[ -]/g, ''); }

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    return jsonResponse(res, 405, { error: 'method_not_allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const game = clean(body.game, 32);
  const userId = clean(body.userId, 64);
  if (!GAMES.has(game) || !userId) return jsonResponse(res, 400, { error: 'invalid_input' });

  try {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO presence (user_id, game_id, last_ping) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE last_ping = NOW()`,
      [userId, game]
    );
    return jsonResponse(res, 200, { ok: true });
  } catch (e) {
    console.error('[api/heartbeat] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'db_error' });
  }
}
