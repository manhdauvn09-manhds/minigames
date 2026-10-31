/**
 * Express adapter — runs the Vercel-style /api handlers + serves static files.
 * Single Node process, suitable for a stand-alone Docker container.
 */
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import score       from './api/score.js';
import leaderboard from './api/leaderboard.js';
import user        from './api/user.js';
import heartbeat   from './api/heartbeat.js';
import stats       from './api/stats.js';
import track       from './api/track.js';
import admin       from './api/admin.js';
import push        from './api/push.js';
import { attachMultiplayer } from './ws-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Trust the proxy (nginx / Cloudflare) so req.ip is correct
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '64kb' }));

// Wrap a Vercel-style handler so Express can use it (req/res are compatible)
const wrap = (h) => async (req, res, next) => { try { await h(req, res); } catch (e) { next(e); } };

// CORS preflight (handlers also set CORS headers themselves)
app.options('/api/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).end();
});

app.post('/api/score',       wrap(score));
app.post('/api/user',        wrap(user));
app.post('/api/heartbeat',   wrap(heartbeat));
app.post('/api/track',       wrap(track));
app.get ('/api/leaderboard', wrap(leaderboard));
app.get ('/api/stats',       wrap(stats));
app.get ('/api/admin',       wrap(admin));
app.get ('/api/push',        wrap(push));
app.post('/api/push',        wrap(push));

// Health check (for docker / nginx upstream)
app.get('/healthz', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Static — same directory as this server file
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: 'index.html',
  setHeaders(res, filePath) {
    if (/\.(?:js|css|svg|webmanifest)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    } else if (/\.html$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
}));

// Fallback (SPA-style) — serve index.html for non-API/non-asset paths
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler — never leak stack to client
app.use((err, _req, res, _next) => {
  console.error('[server] error', err.message);
  res.status(500).json({ error: 'server_error' });
});

const PORT = parseInt(process.env.PORT, 10) || 3333;
const server = http.createServer(app);

// Real-time multiplayer (Kaya/Caro) over WebSocket at /ws
attachMultiplayer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[minigames] listening on :${PORT}`);
});
