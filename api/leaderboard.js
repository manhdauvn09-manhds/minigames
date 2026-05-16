/**
 * GET /api/leaderboard?game=<gameId>&period=all|week
 *  Returns top 20 best scores per user for the game.
 */
import { getPool, tableFor, jsonResponse, setCors, GAMES } from './_db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     return jsonResponse(res, 405, { error: 'method_not_allowed' });

  const game = String(req.query.game || '').slice(0, 32);
  const period = req.query.period === 'week' ? 'week' : 'all';
  if (!GAMES.has(game)) return jsonResponse(res, 400, { error: 'invalid_game' });

  const pool = getPool();
  const tbl  = tableFor(game);
  const where = period === 'week' ? 'WHERE played_at >= NOW() - INTERVAL 7 DAY' : '';

  try {
    const [rows] = await pool.query(
      `SELECT user_id, name,
              MAX(score) AS best_score,
              MAX(level) AS best_level,
              MAX(played_at) AS last_play
         FROM ${tbl}
         ${where}
         GROUP BY user_id, name
         ORDER BY best_score DESC, last_play DESC
         LIMIT 20`
    );
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
    return jsonResponse(res, 200, { rows, period });
  } catch (e) {
    console.error('[api/leaderboard] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'db_error' });
  }
}
