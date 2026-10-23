/**
 * TextMeQR edge API. All personally identifying data stays server-side.
 * No external CDN or QR-generation service handles a user's QR destination.
 */
const day = 86400;
const sessionSeconds = 30 * day;
const encoder = new TextEncoder();
export const allowedReasons = new Set(['blocked', 'lights', 'window', 'damage', 'other']);
const reasonLabels = {
  blocked: 'Parkplatz / Zufahrt blockiert',
  lights: 'Licht ist noch an',
  window: 'Fenster ist offen',
  damage: 'Schaden am Fahrzeug bemerkt',
  other: 'Anderer Hinweis'
};

export function validateEmail(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.includes('..')) return null;
  return value;
}
export function validateLabel(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim().replace(/\s+/g, ' ');
  return value.length >= 1 && value.length <= 40 ? value : null;
}
export function validateNote(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value.length <= 320 ? value : null;
}
function randomToken(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function randomSlug() { return randomToken(16); }
function time() { return Math.floor(Date.now() / 1000); }
function response(value, status = 200, moreHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...moreHeaders }
  });
}
function fail(message, status = 400) { return response({ error: message }, status); }
function getCookie(request, name) {
  const value = request.headers.get('cookie') || '';
  const match = value.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? match[1] : null;
}
function sessionCookie(token, request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return 'tm_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (token ? sessionSeconds : 0) + secure;
}
async function inputBody(request) {
  if (Number(request.headers.get('content-length') || '0') > 5000) throw new Error('PAYLOAD');
  const raw = await request.text();
  if (raw.length > 5000) throw new Error('PAYLOAD');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('INVALID_JSON'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_JSON');
  return parsed;
}
async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function throttled(env, value, limit, seconds) {
  const current = time();
  const key = await sign(env.AUTH_SECRET, 'rate:' + value);
  await env.DB.prepare(
    'INSERT INTO rate_limits (key, hits, reset_at) VALUES (?1, 1, ?2) ON CONFLICT(key) DO UPDATE SET hits = CASE WHEN reset_at <= ?3 THEN 1 ELSE hits + 1 END, reset_at = CASE WHEN reset_at <= ?3 THEN ?2 ELSE reset_at END'
  ).bind(key, current + seconds, current).run();
  const row = await env.DB.prepare('SELECT hits FROM rate_limits WHERE key = ?').bind(key).first();
  return Number(row?.hits || 0) > limit;
}
function clientAddress(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || 'unknown';
}
async function verifiedTurnstile(env, request, token) {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== 'string' || !token) return false;
  const payload = new FormData();
  payload.set('secret', env.TURNSTILE_SECRET_KEY);
  payload.set('response', token);
  payload.set('remoteip', clientAddress(request));
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: payload });
  if (!res.ok) return false;
  const result = await res.json();
  return Boolean(result.success);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
async function sendMail(env, to, subject, html, text) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) throw new Error('MAIL_NOT_CONFIGURED');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html, text })
  });
  if (!res.ok) throw new Error('MAIL_FAILED');
}
async function currentUser(env, request) {
  const token = getCookie(request, 'tm_session');
  if (!token || !env.AUTH_SECRET) return null;
  const tokenHash = await sign(env.AUTH_SECRET, 'session:' + token);
  return env.DB.prepare(
    'SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?'
  ).bind(tokenHash, time()).first();
}
function noStoreError(e) {
  if (e?.message === 'PAYLOAD') return fail('Anfrage ist zu groß.', 413);
  if (e?.message === 'INVALID_JSON') return fail('Ungültige Daten.', 400);
  return fail('Ein Fehler ist aufgetreten. Bitte versuche es erneut.', 500);
}
async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== url.origin) return fail('Ungültiger Ursprung.', 403);
  }
  if (path === '/api/health' && request.method === 'GET') {
    if (!env.DB) return fail('Datenbank ist nicht verbunden.', 503);
    await env.DB.prepare('SELECT 1').first();
    return response({ ok: true, service: 'textmeqr' });
  }
  if (path === '/api/config' && request.method === 'GET') {
    return response({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || null,
      notificationsEnabled: Boolean(env.RESEND_API_KEY && env.MAIL_FROM) });
  }
  if (!env.DB || !env.AUTH_SECRET || env.AUTH_SECRET.length < 24) {
    return fail('Server-Konfiguration noch nicht abgeschlossen.', 503);
  }
  if (path === '/api/auth/request' && request.method === 'POST') {
    const body = await inputBody(request);
    const email = validateEmail(body.email);
    if (!email) return fail('Bitte gib eine gültige E-Mail-Adresse ein.');
    const ip = clientAddress(request);
    if (await throttled(env, 'login-ip:' + ip, 8, 3600) ||
        await throttled(env, 'login-email:' + email, 4, 3600)) return fail('Zu viele Anfragen. Bitte später erneut versuchen.', 429);
    if (!await verifiedTurnstile(env, request, body.turnstileToken)) return fail('Sicherheitsprüfung fehlgeschlagen.', 403);
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) return fail('E-Mail-Versand ist noch nicht eingerichtet.', 503);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    const hash = await sign(env.AUTH_SECRET, 'otp:' + email + ':' + code);
    await env.DB.prepare(
      'INSERT INTO login_codes (email, code_hash, attempts, expires_at) VALUES (?, ?, 0, ?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, attempts=0, expires_at=excluded.expires_at'
    ).bind(email, hash, time() + 600).run();
    try {
      await sendMail(env, email, 'Dein TextMe Zugangscode', '<div style="font-family:Arial,sans-serif;background:#101611;padding:36px;color:white"><h1 style="color:#d8fa64">textme.</h1><p>Dein einmaliger Zugangscode:</p><h2 style="letter-spacing:8px">' + code + '</h2><p>10 Minuten gültig. Wenn du ihn nicht angefordert hast, ignoriere diese E-Mail.</p></div>',
        'Dein TextMe Zugangscode: ' + code + ' (10 Minuten gültig).');
    } catch {
      await env.DB.prepare('DELETE FROM login_codes WHERE email=? AND code_hash=?').bind(email, hash).run();
      return fail('E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.', 503);
    }
    return response({ ok: true });
  }
  if (path === '/api/auth/verify' && request.method === 'POST') {
    const body = await inputBody(request);
    const email = validateEmail(body.email);
    const code = String(body.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) return fail('Ungültiger Code.');
    if (await throttled(env, 'verify:' + clientAddress(request), 20, 3600)) return fail('Zu viele Versuche.', 429);
    const record = await env.DB.prepare('SELECT * FROM login_codes WHERE email = ?').bind(email).first();
    if (!record || record.expires_at < time() || record.attempts >= 5) return fail('Code abgelaufen oder ungültig.', 401);
    const hash = await sign(env.AUTH_SECRET, 'otp:' + email + ':' + code);
    if (hash !== record.code_hash) {
      await env.DB.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?').bind(email).run();
      return fail('Code abgelaufen oder ungültig.', 401);
    }
    // Consume the OTP before creating the authenticated session.
    await env.DB.prepare('DELETE FROM login_codes WHERE email = ?').bind(email).run();
    let user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first();
    if (!user) {
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT OR IGNORE INTO users (id,email,created_at) VALUES (?, ?, ?)').bind(id, email, time()).run();
      user = await env.DB.prepare('SELECT id,email FROM users WHERE email=?').bind(email).first();
    }
    const token = randomToken();
    const tokenHash = await sign(env.AUTH_SECRET, 'session:' + token);
    await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(tokenHash, user.id, time() + sessionSeconds).run();
    return response({ ok: true, email: user.email }, 200, { 'Set-Cookie': sessionCookie(token, request) });
  }
  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await currentUser(env, request);
    return response({ user: user || null });
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    const token = getCookie(request, 'tm_session');
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sign(env.AUTH_SECRET, 'session:' + token)).run();
    return response({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', request) });
  }

  // The scan route never returns a vehicle owner, email, or phone number.
  const publicMatch = path.match(/^\/api\/public\/([A-Za-z0-9_-]{22})$/);
  if (publicMatch) {
    const slug = publicMatch[1];
    const vehicle = await env.DB.prepare('SELECT id,active FROM vehicle_codes WHERE slug=?').bind(slug).first();
    if (!vehicle || !vehicle.active) return fail('Dieser QR-Code ist nicht aktiv.', 404);
    if (request.method === 'GET') {
      await env.DB.prepare('UPDATE vehicle_codes SET views=views+1 WHERE id=?').bind(vehicle.id).run();
      return response({ active: true });
    }
    if (request.method === 'POST') {
      const body = await inputBody(request);
      if (!allowedReasons.has(body.reason)) return fail('Bitte wähle einen gültigen Grund.');
      const note = validateNote(body.note ?? '');
      if (note === null) return fail('Nachricht darf höchstens 320 Zeichen enthalten.');
      if (await throttled(env, 'notify-ip:' + clientAddress(request), 5, 3600) ||
          await throttled(env, 'notify-vehicle:' + vehicle.id, 40, day)) return fail('Bitte später erneut versuchen.', 429);
      if (!await verifiedTurnstile(env, request, body.turnstileToken)) return fail('Sicherheitsprüfung fehlgeschlagen.', 403);
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO messages (id,vehicle_id,reason,note,created_at) VALUES (?,?,?,?,?)')
        .bind(id, vehicle.id, body.reason, note, time()).run();
      // The message is persisted first; mail is a best-effort secondary notification.
      if (env.RESEND_API_KEY && env.MAIL_FROM && ctx?.waitUntil) {
        ctx.waitUntil((async () => {
          const owner = await env.DB.prepare('SELECT users.email FROM vehicle_codes JOIN users ON users.id=vehicle_codes.user_id WHERE vehicle_codes.id=?').bind(vehicle.id).first();
          if (!owner) return;
          try {
            await sendMail(env, owner.email, 'Neuer Hinweis für dein Fahrzeug',
              '<div style="font-family:Arial,sans-serif"><h2>Neuer TextMe Hinweis</h2><p><strong>' + escapeHtml(reasonLabels[body.reason]) +
              '</strong></p><p>' + escapeHtml(note || 'Keine zusätzliche Nachricht') +
              '</p><p>Öffne dein Dashboard, um den Hinweis zu sehen.</p></div>',
              reasonLabels[body.reason] + '\n' + note + '\nÖffne dein TextMe Dashboard.');
            await env.DB.prepare('UPDATE messages SET emailed=1 WHERE id=?').bind(id).run();
          } catch { /* Saved message stays visible in the dashboard. */ }
        })());
      }
      return response({ ok: true }, 201);
    }
  }
  const user = await currentUser(env, request);
  if (!user) return fail('Bitte melde dich an.', 401);

  if (path === '/api/codes' && request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT v.id, v.slug, v.label, v.theme, v.active, v.views, v.created_at, (SELECT COUNT(*) FROM messages m WHERE m.vehicle_id=v.id) AS message_count, (SELECT COUNT(*) FROM messages m WHERE m.vehicle_id=v.id AND m.is_read=0) AS unread_count FROM vehicle_codes v WHERE v.user_id=? ORDER BY v.created_at DESC'
    ).bind(user.id).all();
    return response({ codes: result.results });
  }
  if (path === '/api/codes' && request.method === 'POST') {
    const body = await inputBody(request);
    const label = validateLabel(body.label);
    if (!label) return fail('Bitte gib einen Namen mit maximal 40 Zeichen ein.');
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicle_codes WHERE user_id=?').bind(user.id).first();
    if (count.n >= 12) return fail('Maximal 12 QR-Codes pro Konto.', 409);
    const id = crypto.randomUUID(), slug = randomSlug();
    await env.DB.prepare('INSERT INTO vehicle_codes (id,user_id,slug,label,created_at) VALUES (?,?,?,?,?)').bind(id,user.id,slug,label,time()).run();
    return response({ ok: true, code: { id, slug, label, theme: 'classic_dawn', active: 1, views: 0 } }, 201);
  }
  const codeMatch = path.match(/^\/api\/codes\/([0-9a-f-]{36})$/);
  if (codeMatch && request.method === 'PATCH') {
    const existing = await env.DB.prepare('SELECT id FROM vehicle_codes WHERE id=? AND user_id=?').bind(codeMatch[1],user.id).first();
    if (!existing) return fail('QR-Code nicht gefunden.', 404);
    const body = await inputBody(request);
    if (body.label !== undefined) {
      const label = validateLabel(body.label);
      if (!label) return fail('Ungültiger Name.');
      await env.DB.prepare('UPDATE vehicle_codes SET label=? WHERE id=? AND user_id=?').bind(label,existing.id,user.id).run();
    }
    if (body.theme !== undefined) {
      const themes = new Set(['classic_dawn','galactic_twilight','emerald_canopy','azure_depths','monochic']);
      if (!themes.has(body.theme)) return fail('Ungültiges Design.');
      await env.DB.prepare('UPDATE vehicle_codes SET theme=? WHERE id=? AND user_id=?').bind(body.theme,existing.id,user.id).run();
    }
    if (typeof body.active === 'boolean') {
      await env.DB.prepare('UPDATE vehicle_codes SET active=? WHERE id=? AND user_id=?').bind(Number(body.active),existing.id,user.id).run();
    }
    return response({ ok: true });
  }
  if (path === '/api/messages' && request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT m.id,m.reason,m.note,m.is_read,m.emailed,m.created_at,v.label AS vehicle_label,v.slug FROM messages m JOIN vehicle_codes v ON v.id=m.vehicle_id WHERE v.user_id=? ORDER BY m.created_at DESC LIMIT 100'
    ).bind(user.id).all();
    return response({ messages: rows.results });
  }
  const messageMatch = path.match(/^\/api\/messages\/([0-9a-f-]{36})\/read$/);
  if (messageMatch && request.method === 'PATCH') {
    const updated = await env.DB.prepare(
      'UPDATE messages SET is_read=1 WHERE id=? AND vehicle_id IN (SELECT id FROM vehicle_codes WHERE user_id=?)'
    ).bind(messageMatch[1],user.id).run();
    if (!updated.meta?.changes) return fail('Nachricht nicht gefunden.', 404);
    return response({ ok: true });
  }
  if (path === '/api/account' && request.method === 'DELETE') {
    const body = await inputBody(request);
    if (body.confirm !== 'DELETE') return fail('Bestätigung erforderlich.');
    await env.DB.prepare('DELETE FROM users WHERE id=?').bind(user.id).run();
    return response({ ok: true }, 200, { 'Set-Cookie': sessionCookie('',request) });
  }
  return fail('Nicht gefunden.', 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try { return await handle(request,env,ctx); }
    catch (error) {
      console.error('TextMe API request failed', error instanceof Error ? error.message : 'unknown');
      return noStoreError(error);
    }
  },
  async scheduled(_event,env,_ctx) {
    if (!env.DB) return;
    const current = time();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM login_codes WHERE expires_at < ?').bind(current),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(current),
      env.DB.prepare('DELETE FROM rate_limits WHERE reset_at < ?').bind(current)
    ]);
  }
};
