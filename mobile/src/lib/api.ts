// Cliente de la API de administración de EverShop.
//
// Autenticación: POST /api/user/tokens devuelve un token de acceso (15 min) y
// uno de refresco (15 h). Las peticiones llevan `Authorization: Bearer …`;
// ante un 401 se renueva el token una vez con POST /api/user/token/refresh y,
// si tampoco vale, se cierra la sesión y la app vuelve a la pantalla de acceso.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Session = {
  baseUrl: string;
  email: string;
  accessToken: string;
  refreshToken: string;
};

const SESSION_KEY = 'tienda.session';
const LAST_LOGIN_KEY = 'tienda.lastLogin';

// Llavero del sistema en el móvil; en la versión web (solo para desarrollo), localStorage.
const storage =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
        setItemAsync: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
        deleteItemAsync: async (k: string) => globalThis.localStorage?.removeItem(k)
      }
    : SecureStore;

let session: Session | null = null;
let refreshing: Promise<boolean> | null = null;
let onSignedOut: (() => void) | null = null;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

export function normalizeBaseUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

export const getSession = () => session;

export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await storage.getItemAsync(SESSION_KEY);
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
  return session;
}

async function saveSession(s: Session | null) {
  session = s;
  if (s) await storage.setItemAsync(SESSION_KEY, JSON.stringify(s));
  else await storage.deleteItemAsync(SESSION_KEY);
}

/** Tienda y email del último acceso, para rellenar el formulario. */
export async function getLastLogin(): Promise<{ baseUrl: string; email: string } | null> {
  try {
    const raw = await storage.getItemAsync(LAST_LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(
      res.status === 404
        ? 'No se encuentra la API en esa dirección. ¿Es la URL de la tienda?'
        : `Respuesta inesperada del servidor (HTTP ${res.status})`,
      res.status
    );
  }
}

function friendlyLoginError(message: string): string {
  if (/secret.*not configured/i.test(message)) {
    return 'La tienda no tiene configurados los secretos JWT (JWT_ADMIN_SECRET y JWT_ADMIN_REFRESH_SECRET). Actualice el servidor y vuelva a intentarlo.';
  }
  if (/invalid email or password/i.test(message)) return 'Email o contraseña incorrectos.';
  return message;
}

export async function signIn(baseUrlInput: string, email: string, password: string): Promise<Session> {
  const baseUrl = normalizeBaseUrl(baseUrlInput);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/user/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });
  } catch {
    throw new ApiError('No se puede conectar con la tienda. Revise la dirección y la conexión a internet.');
  }
  const body = await readJson(res);
  if (!res.ok || body.error || !body.data?.accessToken) {
    throw new ApiError(friendlyLoginError(body.error?.message || `Error HTTP ${res.status}`), res.status);
  }
  const s: Session = {
    baseUrl,
    email: email.trim(),
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken
  };
  await saveSession(s);
  await storage.setItemAsync(LAST_LOGIN_KEY, JSON.stringify({ baseUrl, email: s.email }));
  return s;
}

export async function signOut() {
  await saveSession(null);
  onSignedOut?.();
}

async function refreshAccessToken(): Promise<boolean> {
  if (!session) return false;
  if (!refreshing) {
    const current = session;
    refreshing = (async () => {
      try {
        const res = await fetch(`${current.baseUrl}/api/user/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken })
        });
        const body = await readJson(res);
        if (!res.ok || !body.data?.accessToken) return false;
        await saveSession({ ...current, accessToken: body.data.accessToken });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  json?: unknown;
  form?: FormData;
};

export async function request<T = any>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  if (!session) throw new ApiError('Sesión cerrada', 401);
  const { method = 'GET', json, form } = opts;
  let res: Response;
  try {
    res = await fetch(`${session.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: json !== undefined ? JSON.stringify(json) : form
    });
  } catch {
    throw new ApiError('Sin conexión con la tienda. Compruebe su conexión a internet.');
  }

  if (res.status === 401) {
    if (!retried && (await refreshAccessToken())) return request<T>(path, opts, true);
    await signOut();
    throw new ApiError('La sesión ha caducado. Vuelva a iniciar sesión.', 401);
  }

  const body = await readJson(res);
  if (!res.ok || body?.error) {
    throw new ApiError(body?.error?.message || `Error HTTP ${res.status}`, res.status);
  }
  return body as T;
}

export async function graphql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const body = await request<{ data?: T; errors?: { message: string }[] }>('/api/admin/graphql', {
    method: 'POST',
    json: { query, variables }
  });
  if (body.errors?.length) throw new ApiError(body.errors[0].message);
  return body.data as T;
}

/** Convierte las rutas relativas de EverShop (/assets/…) en URL absolutas. */
export function absoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return session ? `${session.baseUrl}${url.startsWith('/') ? '' : '/'}${url}` : url;
}

export type LocalImage = { uri: string; fileName?: string | null; mimeType?: string | null };

/**
 * Sube fotos a la tienda (Blob Storage en Azure) con el mismo endpoint que el
 * panel web y devuelve sus URL, listas para el campo `images` del producto.
 */
export async function uploadImages(folder: string, images: LocalImage[]): Promise<string[]> {
  if (images.length === 0) return [];
  const form = new FormData();
  for (const [i, img] of images.entries()) {
    const type = img.mimeType || 'image/jpeg';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('heic') ? 'heic' : 'jpg';
    const name = img.fileName || `foto-${Date.now()}-${i + 1}.${ext}`;
    if (Platform.OS === 'web') {
      form.append('images', await (await fetch(img.uri)).blob(), name);
    } else {
      // En React Native, FormData acepta { uri, name, type } para ficheros locales.
      form.append('images', { uri: img.uri, name, type } as unknown as Blob);
    }
  }
  const body = await request<{ data: { files: { url: string }[] } }>(`/api/images/${folder}`, {
    method: 'POST',
    form
  });
  return body.data.files.map((f) => f.url);
}
