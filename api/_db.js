/**
 * Shared MySQL connection pool for Vercel serverless functions.
 * Connection string read from process.env.DATABASE_URL (mysql://user:pass@host:port/db).
 */
import mysql from 'mysql2/promise';

let pool = null;

export function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 5,        // serverless: keep low; each instance = one pool
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

/**
 * Allowed game IDs (whitelist) — prevents SQL injection via dynamic table names.
 * Each game has its own table; add new games here when launched.
 */
export const GAMES = new Set([
  'ballmerge',
  'chromamatch',
  'stacktower',
  'memoryflip',
  'snakerush',
  'bubbleblast',
  'arkanoidx',
  'numberslide',
]);

export function tableFor(gameId) {
  if (!GAMES.has(gameId)) throw new Error('Unknown game: ' + gameId);
  // SAFE: gameId is whitelist-validated; identifier is alphanumeric only.
  return '`scores_' + gameId.replace(/[^a-z0-9_]/g, '') + '`';
}

export function jsonResponse(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/** Verify Google ID token (best-effort). Returns payload or null. */
export async function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  try {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
    if (!r.ok) return null;
    const p = await r.json();
    if (process.env.GOOGLE_CLIENT_ID && p.aud !== process.env.GOOGLE_CLIENT_ID) return null;
    return p;
  } catch { return null; }
}

export function getBearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}
