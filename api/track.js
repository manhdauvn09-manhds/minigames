/**
 * POST /api/track
 *  Body: { type: 'session' | 'pageview', sid: string, game?: string }
 *
 *  type=session  → register / refresh a visitor session (30-min timeout).
 *                  If session is new or expired, increments total_visitors.
 *                  If game is provided, also tracks per-game visitor session.
 *  type=pageview → increments total_pageviews + refreshes session.
 *                  If game is provided, also increments per-game pageviews.
 *
 *  Returns: { ok: true, newSession?: boolean }
 */
import { getPool, jsonResponse, setCors, GAMES } from './_db.js';

const SESSION_TIMEOUT_MIN = 30;
const UUID_RE = /^[a-f0-9\-]{36}$/i;

function clean(s, max) { return String(s || '').trim().slice(0, max || 36); }

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'method_not_allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const type = String(body.type || '').slice(0, 16);
  const sid  = clean(body.sid, 36);
  const game = clean(body.game, 32).replace(/[^a-z0-9_]/g, '') || null;

  if (!sid || !UUID_RE.test(sid)) return jsonResponse(res, 400, { error: 'invalid_sid' });
  if (type !== 'session' && type !== 'pageview') return jsonResponse(res, 400, { error: 'invalid_type' });
  // Validate game if provided
  const validGame = game && GAMES.has(game) ? game : null;

  const pool = getPool();

  try {
    if (type === 'session') {
      const newSite = await upsertSiteSession(pool, sid);
      if (validGame) await upsertGameSession(pool, sid, validGame);
      return jsonResponse(res, 200, { ok: true, newSession: newSite });
    }

    // pageview — increment site-wide + per-game
    const tasks = [
      refreshSiteSession(pool, sid),
      incrCounter(pool, 'total_pageviews'),
    ];
    if (validGame) {
      tasks.push(refreshGameSession(pool, sid, validGame));
      tasks.push(incrGameCounter(pool, validGame, 'pageviews'));
    }
    await Promise.all(tasks);
    return jsonResponse(res, 200, { ok: true });
  } catch (e) {
    console.error('[api/track] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'db_error' });
  }
}

// ── Site-wide session ──────────────────────────────────────────────────

async function upsertSiteSession(pool, sid) {
  const [rows] = await pool.execute(
    `SELECT last_active FROM visitor_sessions WHERE session_id = ?`, [sid]
  );

  if (rows.length === 0) {
    await pool.execute(`INSERT INTO visitor_sessions (session_id) VALUES (?)`, [sid]);
    await incrCounter(pool, 'total_visitors');
    return true;
  }

  const elapsed = (Date.now() - new Date(rows[0].last_active).getTime()) / 60000;
  await pool.execute(`UPDATE visitor_sessions SET last_active = NOW() WHERE session_id = ?`, [sid]);

  if (elapsed >= SESSION_TIMEOUT_MIN) {
    await incrCounter(pool, 'total_visitors');
    return true;
  }
  return false;
}

function refreshSiteSession(pool, sid) {
  return pool.execute(
    `INSERT INTO visitor_sessions (session_id) VALUES (?)
     ON DUPLICATE KEY UPDATE last_active = NOW()`, [sid]
  );
}

// ── Per-game session ───────────────────────────────────────────────────

async function upsertGameSession(pool, sid, game) {
  const [rows] = await pool.execute(
    `SELECT last_active FROM game_visitor_sessions WHERE session_id = ? AND game_id = ?`,
    [sid, game]
  );

  if (rows.length === 0) {
    await pool.execute(
      `INSERT INTO game_visitor_sessions (session_id, game_id) VALUES (?, ?)`,
      [sid, game]
    );
    await incrGameCounter(pool, game, 'visitors');
    return true;
  }

  const elapsed = (Date.now() - new Date(rows[0].last_active).getTime()) / 60000;
  await pool.execute(
    `UPDATE game_visitor_sessions SET last_active = NOW() WHERE session_id = ? AND game_id = ?`,
    [sid, game]
  );

  if (elapsed >= SESSION_TIMEOUT_MIN) {
    await incrGameCounter(pool, game, 'visitors');
    return true;
  }
  return false;
}

function refreshGameSession(pool, sid, game) {
  return pool.execute(
    `INSERT INTO game_visitor_sessions (session_id, game_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE last_active = NOW()`, [sid, game]
  );
}

// ── Counter helpers ────────────────────────────────────────────────────

function incrCounter(pool, key) {
  return pool.execute(
    `UPDATE site_counters SET counter_value = counter_value + 1 WHERE counter_key = ?`, [key]
  );
}

function incrGameCounter(pool, game, key) {
  return pool.execute(
    `INSERT INTO game_counters (game_id, counter_key, counter_value) VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE counter_value = counter_value + 1`, [game, key]
  );
}
