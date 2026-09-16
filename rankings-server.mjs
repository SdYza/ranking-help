/**
 * Backend do ranking automático da Help.
 *
 * Uso:
 *   HELP_DASHBOARD_JWT='seu-jwt-de-admin-ou-analista' node rankings-server.mjs
 *
 * O token fica apenas no servidor. O navegador consome /api/rankings/otd
 * no mesmo domínio e nunca recebe a credencial da dashboard-relatorio-api.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = Number(process.env.PORT || 4173);
// Em provedores como Render, Railway e Docker, a porta e o host vêm do ambiente.
const HOST = process.env.HOST || '0.0.0.0';
const API_BASE = (process.env.HELP_DASHBOARD_API_URL || 'https://live-he-dashboard-relatorio-api-service.helpentregas.com.br').replace(/\/$/, '');
const TOKEN = process.env.HELP_DASHBOARD_JWT;
const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin'
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function iso(date) { return date.toISOString().slice(0, 10); }

function periodRange(period) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  if (period === 'month') start.setDate(1);
  else {
    const weekday = start.getDay();
    start.setDate(start.getDate() - (weekday === 0 ? 6 : weekday - 1)); // segunda-feira
  }
  return { dataInicial: iso(start), dataFinal: iso(today) };
}

async function performance(period) {
  if (!TOKEN) throw Object.assign(new Error('A variável HELP_DASHBOARD_JWT não está configurada no servidor.'), { status: 503 });
  const key = period;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_MS) return cached.value;

  const { dataInicial, dataFinal } = periodRange(period);
  const url = new URL('/dashboard-financeiro/admin/performance-entregadores', API_BASE);
  url.search = new URLSearchParams({
    dataInicial, dataFinal, page: '1', limit: '50', orderBy: 'percentualOTD',
    orderDirection: 'DESC', minimoCorridas: '5'
  }).toString();
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) {
    throw Object.assign(new Error(`A dashboard-relatorio-api respondeu ${response.status}.`), { status: 502 });
  }
  const payload = await response.json();
  const value = { period, dataInicial, dataFinal, refreshedAt: new Date().toISOString(), ...payload };
  cache.set(key, { createdAt: Date.now(), value });
  return value;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { error: 'Método não permitido.' });
    return;
  }
  if (url.pathname === '/health') {
    send(res, 200, { status: 'ok', apiConfigured: Boolean(TOKEN) });
    return;
  }
  if (url.pathname === '/api/rankings/otd') {
    const period = url.searchParams.get('period') === 'month' ? 'month' : 'week';
    try { send(res, 200, await performance(period)); }
    catch (error) { send(res, error.status || 500, { error: error.message }); }
    return;
  }
  if (url.pathname === '/' || url.pathname === '/rankings-help.html') {
    try { send(res, 200, await readFile(join(HERE, 'rankings-help.html'), 'utf8'), 'text/html; charset=utf-8'); }
    catch { send(res, 500, 'Não foi possível abrir a interface.', 'text/plain; charset=utf-8'); }
    return;
  }
  send(res, 404, { error: 'Rota não encontrada.' });
}).listen(PORT, HOST, () => console.log(`Ranking Help disponível na porta ${PORT}.`));
