/**
 * GET /api/stats?game=<gameId>
 * GET /api/stats?all=1
 *
 * Returns per-game counters:
 *   - players: distinct user_id who ever played
 *   - online:  distinct user_id with presence.last_ping in the last 2 minutes
 *   - plays:   number of "sessions" (consecutive plays separated by ≥20-min gaps)
 *
 * Cached at the edge for 30s to avoid hammering the DB.
 */
import { getPool, tableFor, jsonResponse, setCors, GAMES } from './_db.js';

const ONLINE_WINDOW_MIN = 2;
const SESSION_GAP_MIN   = 20;

async function getSiteCounters(pool) {
  try {
    const [rows] = await pool.query(
      `SELECT counter_key, counter_value FROM site_counters WHERE counter_key IN ('total_visitors','total_pageviews')`
    );
    const map = {};
    rows.forEach(r => { map[r.counter_key] = Number(r.counter_value); });
    return {
      totalVisitors:  map.total_visitors  || 0,
      totalPageviews: map.total_pageviews || 0,
    };
  } catch {
    return { totalVisitors: 0, totalPageviews: 0 };
  }
}

async function getGameCounters(pool, gameId) {
  try {
    const [rows] = await pool.query(
      `SELECT counter_key, counter_value FROM game_counters WHERE game_id = ?`,
      [gameId]
    );
    const map = {};
    rows.forEach(r => { map[r.counter_key] = Number(r.counter_value); });
    return { visitors: map.visitors || 0, views: map.pageviews || 0 };
  } catch {
    return { visitors: 0, views: 0 };
  }
}

async function gameStats(pool, gameId) {
  const tbl = tableFor(gameId);

  // Total distinct players + total session count (using LAG window function).
  const [rows] = await pool.query(
    `SELECT
       COUNT(DISTINCT user_id) AS players,
       (SELECT COUNT(*) FROM (
          SELECT played_at, LAG(played_at) OVER (PARTITION BY user_id ORDER BY played_at) AS prev
          FROM ${tbl}
        ) t
        WHERE prev IS NULL OR TIMESTAMPDIFF(MINUTE, prev, played_at) >= ?
       ) AS plays
     FROM ${tbl}`,
    [SESSION_GAP_MIN]
  );

  // Currently online (from presence)
  const [onl] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) AS online
       FROM presence
      WHERE game_id = ? AND last_ping > NOW() - INTERVAL ? MINUTE`,
    [gameId, ONLINE_WINDOW_MIN]
  );

  // Per-game visitors + views
  const gc = await getGameCounters(pool, gameId);

  return {
    game:     gameId,
    players:  rows[0]?.players || 0,
    plays:    rows[0]?.plays   || 0,
    online:   onl[0]?.online   || 0,
    visitors: gc.visitors,
    views:    gc.views,
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     return jsonResponse(res, 405, { error: 'method_not_allowed' });

  const all = !!req.query.all;
  const game = String(req.query.game || '').slice(0, 32);
  if (!all && !GAMES.has(game)) return jsonResponse(res, 400, { error: 'invalid_game' });

  const pool = getPool();
  try {
    // Always fetch site-wide counters
    const siteCounters = await getSiteCounters(pool);

    if (all) {
      const ids = [...GAMES];
      const list = await Promise.all(ids.map(id => gameStats(pool, id).catch(() => ({ game:id, players:0, plays:0, online:0 }))));
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return jsonResponse(res, 200, { games: list, ...siteCounters });
    } else {
      const data = await gameStats(pool, game);
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      return jsonResponse(res, 200, { ...data, ...siteCounters });
    }
  } catch (e) {
    console.error('[api/stats] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'db_error' });
  }
}
