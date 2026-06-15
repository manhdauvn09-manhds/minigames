/**
 * GET /api/admin — owner dashboard data (admin-only).
 *
 * Auth: Authorization: Bearer <google id_token>.
 *       The verified Google email must be listed in ADMIN_EMAILS (comma-separated env).
 *       If ADMIN_EMAILS is empty, the endpoint is locked (403 for everyone).
 *
 * Returns site counters, per-game aggregates, recent users.
 */
import { getPool, tableFor, jsonResponse, setCors, verifyGoogleToken, getBearer, GAMES } from './_db.js';

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  );
}

/** Returns the admin payload if the bearer token is a valid Google token for an allow-listed email, else null. */
export async function requireAdmin(req) {
  const token = getBearer(req);
  if (!token) return null;
  const pl = await verifyGoogleToken(token);
  if (!pl || !pl.email) return null;
  if (!adminEmails().has(String(pl.email).toLowerCase())) return null;
  return pl;
}

async function perGame(pool, gameId) {
  const tbl = tableFor(gameId);
  const [[agg]] = await pool.query(
    `SELECT COUNT(*) plays, COUNT(DISTINCT user_id) players,
            COALESCE(MAX(score),0) maxScore, MAX(played_at) lastPlayed
       FROM ${tbl}`
  );
  const [[onl]] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) online FROM presence
      WHERE game_id = ? AND last_ping > NOW() - INTERVAL 2 MINUTE`, [gameId]
  );
  const [top] = await pool.query(`SELECT name, score FROM ${tbl} ORDER BY score DESC LIMIT 1`);
  return {
    game:       gameId,
    plays:      Number(agg.plays)    || 0,
    players:    Number(agg.players)  || 0,
    maxScore:   Number(agg.maxScore) || 0,
    lastPlayed: agg.lastPlayed,
    online:     Number(onl.online)   || 0,
    topName:    top[0]?.name  || null,
    topScore:   Number(top[0]?.score) || 0,
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     return jsonResponse(res, 405, { error: 'method_not_allowed' });

  const admin = await requireAdmin(req);
  if (!admin) return jsonResponse(res, 403, { error: 'forbidden' });

  const pool = getPool();
  try {
    const [[users]] = await pool.query(
      `SELECT COUNT(*) total,
              SUM(type='google') google,
              SUM(type='guest')  guest
         FROM users`
    );
    const [[site]] = await pool.query(
      `SELECT
         (SELECT counter_value FROM site_counters WHERE counter_key='total_visitors')  visitors,
         (SELECT counter_value FROM site_counters WHERE counter_key='total_pageviews') pageviews,
         (SELECT COUNT(DISTINCT user_id) FROM presence WHERE last_ping > NOW() - INTERVAL 2 MINUTE) onlineNow`
    );
    const [recent] = await pool.query(
      `SELECT name, email, type, last_seen FROM users ORDER BY last_seen DESC LIMIT 15`
    );
    let pushSubs = 0;
    try {
      const [[ps]] = await pool.query(`SELECT COUNT(*) c FROM push_subscriptions`);
      pushSubs = Number(ps.c) || 0;
    } catch { /* table may not exist yet */ }

    const games = await Promise.all(
      [...GAMES].map(id => perGame(pool, id).catch(() => ({
        game: id, plays: 0, players: 0, maxScore: 0, lastPlayed: null, online: 0, topName: null, topScore: 0,
      })))
    );

    return jsonResponse(res, 200, {
      ok: true,
      admin: { name: admin.name, email: admin.email },
      users: { total: Number(users.total) || 0, google: Number(users.google) || 0, guest: Number(users.guest) || 0 },
      site:  { visitors: Number(site.visitors) || 0, pageviews: Number(site.pageviews) || 0, onlineNow: Number(site.onlineNow) || 0 },
      pushSubs,
      games,
      recent,
      generatedAt: Date.now(),
    });
  } catch (e) {
    console.error('[api/admin] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'db_error' });
  }
}
