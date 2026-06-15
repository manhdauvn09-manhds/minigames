/**
 * Web Push API — subscription store + admin broadcast.
 *
 *   GET  /api/push?action=key                 → { key } public VAPID key (for PushManager.subscribe)
 *   POST /api/push  { action:'subscribe', subscription, userId? }   → store
 *   POST /api/push  { action:'unsubscribe', endpoint }              → remove
 *   POST /api/push  { action:'send', title, body, url? }            → ADMIN broadcast (Bearer google token)
 *
 * Requires env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...).
 * Subscriptions live in table `push_subscriptions` (see api/schema.sql).
 */
import webpush from 'web-push';
import { getPool, jsonResponse, setCors } from './_db.js';
import { requireAdmin } from './admin.js';

let _configured = null;
function configure() {
  if (_configured !== null) return _configured;
  const pub = process.env.VAPID_PUBLIC_KEY, prv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || 'mailto:admin@allin1site.com';
  if (!pub || !prv) { _configured = false; return false; }
  try { webpush.setVapidDetails(sub, pub, prv); _configured = true; }
  catch (e) { console.error('[api/push] vapid config error', e.message); _configured = false; }
  return _configured;
}

function clean(s, max) { return String(s == null ? '' : s).slice(0, max); }

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const pool = getPool();

  // ── Public: hand the frontend the VAPID public key so it can subscribe ──
  if (req.method === 'GET') {
    const action = String(req.query.action || '');
    if (action === 'key') {
      const key = process.env.VAPID_PUBLIC_KEY || '';
      return jsonResponse(res, 200, { key, enabled: !!key });
    }
    return jsonResponse(res, 400, { error: 'bad_action' });
  }

  if (req.method !== 'POST') return jsonResponse(res, 405, { error: 'method_not_allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const action = String(body.action || '');

  try {
    // ── Store a browser push subscription ──
    if (action === 'subscribe') {
      const s = body.subscription || {};
      const endpoint = clean(s.endpoint, 500);
      const p256dh = clean(s.keys && s.keys.p256dh, 200);
      const auth = clean(s.keys && s.keys.auth, 100);
      const userId = body.userId ? clean(body.userId, 64) : null;
      if (!endpoint || !p256dh || !auth) return jsonResponse(res, 400, { error: 'invalid_subscription' });
      await pool.execute(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth), user_id=VALUES(user_id)`,
        [endpoint, p256dh, auth, userId]
      );
      return jsonResponse(res, 200, { ok: true });
    }

    // ── Remove a subscription ──
    if (action === 'unsubscribe') {
      const endpoint = clean(body.endpoint, 500);
      if (endpoint) await pool.execute(`DELETE FROM push_subscriptions WHERE endpoint=?`, [endpoint]);
      return jsonResponse(res, 200, { ok: true });
    }

    // ── Admin broadcast ──
    if (action === 'send') {
      const admin = await requireAdmin(req);
      if (!admin) return jsonResponse(res, 403, { error: 'forbidden' });
      if (!configure()) return jsonResponse(res, 503, { error: 'vapid_not_configured' });

      const payload = JSON.stringify({
        title: clean(body.title, 80) || 'MiniGames',
        body:  clean(body.body, 180) || '',
        url:   clean(body.url, 200)  || '/',
      });

      const [rows] = await pool.query(`SELECT endpoint, p256dh, auth FROM push_subscriptions`);
      let sent = 0, pruned = 0;
      await Promise.all(rows.map(async r => {
        const subscription = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
        try { await webpush.sendNotification(subscription, payload); sent++; }
        catch (err) {
          // 404/410 = subscription expired/gone → prune it
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pool.execute(`DELETE FROM push_subscriptions WHERE endpoint=?`, [r.endpoint]).catch(() => {});
            pruned++;
          }
        }
      }));
      return jsonResponse(res, 200, { ok: true, total: rows.length, sent, pruned });
    }

    return jsonResponse(res, 400, { error: 'bad_action' });
  } catch (e) {
    console.error('[api/push] error', e.code, e.message);
    return jsonResponse(res, 500, { error: 'server_error' });
  }
}
