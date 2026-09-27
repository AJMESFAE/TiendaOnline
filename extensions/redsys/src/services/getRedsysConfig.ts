import config from 'config';
import { getSetting } from '@evershop/evershop/setting/services';

/**
 * Resolución de la configuración de Redsys. Prioridad (igual que el resto de
 * pasarelas de EverShop):
 *
 *   1. config `system.redsys.*`      (fichero config/*.json)
 *   2. variable de entorno REDSYS_*   (App Settings de Azure / Key Vault)
 *   3. ajuste del panel de administración (Configuración → Pagos)
 *
 * Así los secretos de producción pueden vivir en Azure y no en la base de datos.
 */

export const REDSYS_ENDPOINTS = {
  test: {
    redirect: 'https://sis-t.redsys.es:25443/sis/realizarPago',
    rest: 'https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST'
  },
  live: {
    redirect: 'https://sis.redsys.es/sis/realizarPago',
    rest: 'https://sis.redsys.es/sis/rest/trataPeticionREST'
  }
} as const;

export type RedsysEnvironment = keyof typeof REDSYS_ENDPOINTS;

export interface RedsysConfig {
  enabled: boolean;
  displayName: string;
  merchantCode: string;
  terminal: string;
  secretKey: string;
  environment: RedsysEnvironment;
  currency: string;
  merchantName: string;
  /** '' = todos los métodos del TPV, 'C' = solo tarjeta, 'z' = solo Bizum */
  payMethods: string;
  /** Idioma del TPV: 001 castellano, 002 inglés, 003 catalán... */
  consumerLanguage: string;
  /** Horas tras las que un pedido Redsys pendiente se cancela y repone stock */
  abandonedAfterHours: number;
}

/** Lee `system.redsys.<key>` del fichero de configuración (node-config). */
export function redsysOption<T>(key: string, defaultValue: T): T {
  const path = `system.redsys.${key}`;
  return config.has(path) ? (config.get(path) as T) : defaultValue;
}

const ENV_MAP: Record<string, string> = {
  status: 'REDSYS_STATUS',
  merchantCode: 'REDSYS_MERCHANT_CODE',
  terminal: 'REDSYS_TERMINAL',
  secretKey: 'REDSYS_SECRET_KEY',
  environment: 'REDSYS_ENVIRONMENT',
  currency: 'REDSYS_CURRENCY',
  merchantName: 'REDSYS_MERCHANT_NAME',
  payMethods: 'REDSYS_PAY_METHODS'
};

/** Valor fijado por infraestructura (config o entorno), si existe. */
export function getPinnedValue(key: string): string | undefined {
  const fromConfig = redsysOption<unknown>(key, undefined);
  if (fromConfig !== undefined && fromConfig !== null && `${fromConfig}` !== '') {
    return String(fromConfig);
  }
  const envName = ENV_MAP[key];
  const fromEnv = envName ? process.env[envName] : undefined;
  if (fromEnv !== undefined && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }
  return undefined;
}

async function resolve(
  key: string,
  settingName: string,
  defaultValue: string
): Promise<string> {
  const pinned = getPinnedValue(key);
  if (pinned !== undefined) {
    return pinned;
  }
  const value = await getSetting<string | null>(settingName, null);
  if (value === null || value === undefined || `${value}` === '') {
    return defaultValue;
  }
  return String(value);
}

export async function getRedsysConfig(): Promise<RedsysConfig> {
  const environment = await resolve('environment', 'redsysEnvironment', 'test');
  return {
    enabled: parseInt(await resolve('status', 'redsysPaymentStatus', '0'), 10) === 1,
    displayName: await getSetting('redsysDisplayName', 'Tarjeta (Redsys)'),
    merchantCode: await resolve('merchantCode', 'redsysMerchantCode', ''),
    terminal: await resolve('terminal', 'redsysTerminal', '1'),
    secretKey: await resolve('secretKey', 'redsysSecretKey', ''),
    environment: environment === 'live' ? 'live' : 'test',
    currency: await resolve('currency', 'redsysCurrency', '978'),
    merchantName: await resolve(
      'merchantName',
      'redsysMerchantName',
      await getSetting('storeName', 'Fundación Andalusí')
    ),
    payMethods: await resolve('payMethods', 'redsysPayMethods', ''),
    consumerLanguage: String(redsysOption('consumerLanguage', '001')),
    abandonedAfterHours: Number(redsysOption('abandonedAfterHours', 3))
  };
}

export function assertConfigured(config: RedsysConfig): void {
  const missing: string[] = [];
  if (!config.merchantCode) missing.push('código de comercio (FUC)');
  if (!config.terminal) missing.push('terminal');
  if (!config.secretKey) missing.push('clave secreta SHA-256');
  if (missing.length > 0) {
    throw new Error(`Redsys no está configurado: falta ${missing.join(', ')}`);
  }
}
