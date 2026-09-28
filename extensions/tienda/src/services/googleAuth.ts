import crypto from 'crypto';
import { createCustomer } from '@evershop/evershop/customer/services';
import { getBaseUrl } from '@evershop/evershop/lib/util/getBaseUrl';
import { pool } from '@evershop/evershop/lib/postgres';

/**
 * Inicio de sesión con Google (OAuth 2.0 / OpenID Connect, flujo con código y PKCE).
 *
 * Se activa con GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET (App Settings). En Google
 * Cloud el cliente OAuth («Aplicación web») debe tener como URI de redirección
 * autorizado <URL de la tienda>/auth/google/callback.
 */
// Las variables GOOGLE_OAUTH_*_URL solo sirven para pruebas locales con un Google simulado.
const AUTH_URL = process.env.GOOGLE_OAUTH_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = process.env.GOOGLE_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const STATE_COOKIE = 'tienda_google_oauth';
export const CALLBACK_PATH = '/auth/google/callback';

const clientId = () => process.env.GOOGLE_CLIENT_ID?.trim() || '';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
export const googleLoginEnabled = () => !!(clientId() && clientSecret());
export const redirectUri = () => `${getBaseUrl()}${CALLBACK_PATH}`;

const b64url = (buf: Buffer) => buf.toString('base64url');

/** Solo rutas de la propia tienda (evita redirecciones abiertas). */
export function safeReturnPath(value: unknown, fallback = '/'): string {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : fallback;
}

export interface OAuthState {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  locale: string;
}

export function startLogin(returnTo: string, locale: string): { url: string; saved: OAuthState } {
  const saved: OAuthState = {
    state: b64url(crypto.randomBytes(24)),
    nonce: b64url(crypto.randomBytes(24)),
    verifier: b64url(crypto.randomBytes(48)),
    returnTo,
    locale
  };
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: saved.state,
    nonce: saved.nonce,
    code_challenge: b64url(crypto.createHash('sha256').update(saved.verifier).digest()),
    code_challenge_method: 'S256',
    prompt: 'select_account',
    hl: locale
  });
  return { url: `${AUTH_URL}?${params}`, saved };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/**
 * Cambia el código por el id_token. El token llega directamente de Google por TLS
 * (con el secreto del cliente), así que según OpenID Connect Core §3.1.3.7 basta
 * con validar emisor, destinatario, caducidad y nonce, sin comprobar la firma.
 */
export async function finishLogin(code: string, saved: OAuthState): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
      code_verifier: saved.verifier
    }),
    signal: AbortSignal.timeout(15000)
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.id_token !== 'string') {
    throw new Error(`Google token error ${res.status}: ${body.error || 'sin id_token'}`);
  }
  const claims = JSON.parse(Buffer.from(body.id_token.split('.')[1] || '', 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS.includes(claims.iss)) throw new Error('id_token: emisor no válido');
  if (!aud.includes(clientId())) throw new Error('id_token: destinatario no válido');
  if (typeof claims.exp !== 'number' || claims.exp < now - 60) throw new Error('id_token: caducado');
  if (claims.nonce !== saved.nonce) throw new Error('id_token: nonce no válido');
  if (!claims.sub || !claims.email || (claims.email_verified !== true && claims.email_verified !== 'true')) {
    throw new Error('La cuenta de Google no tiene un correo verificado');
  }
  return {
    sub: String(claims.sub),
    email: String(claims.email).toLowerCase(),
    name: String(claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || claims.email)
  };
}

export class CustomerDisabledError extends Error {}

/**
 * Cliente de la tienda para la cuenta de Google: el ya vinculado; si no, el que
 * tiene ese correo (Google lo ha verificado), que queda vinculado; si no, uno
 * nuevo (con una contraseña aleatoria; puede crear la suya con «¿Olvidó su
 * contraseña?»). Devuelve el id y si se ha creado.
 */
export async function findOrCreateCustomer(p: GoogleProfile): Promise<{ customerId: number; created: boolean }> {
  const linked = await pool.query(
    `SELECT c.customer_id, c.status FROM tienda_google_account g
     JOIN customer c ON c.customer_id = g.customer_id WHERE g.google_sub = $1`,
    [p.sub]
  );
  let customer = linked.rows[0];
  if (!customer) {
    const byEmail = await pool.query('SELECT customer_id, status FROM customer WHERE lower(email) = $1 LIMIT 1', [p.email]);
    customer = byEmail.rows[0];
  }
  let created = false;
  if (!customer) {
    const row: any = await createCustomer({
      email: p.email,
      full_name: p.name.slice(0, 255),
      password: `${b64url(crypto.randomBytes(24))}aA1!`,
      status: 1
    });
    customer = { customer_id: row.customer_id, status: 1 };
    created = true;
  }
  if (Number(customer.status) !== 1) throw new CustomerDisabledError('Cuenta desactivada');
  await pool.query(
    `INSERT INTO tienda_google_account (google_sub, customer_id, email) VALUES ($1, $2, $3)
     ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email`,
    [p.sub, customer.customer_id, p.email]
  );
  return { customerId: customer.customer_id, created };
}
