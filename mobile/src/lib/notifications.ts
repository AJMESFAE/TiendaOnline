// Avisos de pedido nuevo. La tienda (extensions/mobile-app) los envía por
// Expo Push a todos los móviles registrados cuando se confirma un pedido.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { request } from './api';
import { colors } from './theme';

export type PushState =
  | { status: 'enabled' }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: string };

let registeredToken: string | null = null;

if (Platform.OS !== 'web') {
  // Con la app abierta también se muestra el aviso.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true
    })
  });
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Pide permiso (solo la primera vez, o si `askAgain`), obtiene el token de
 * Expo Push y lo registra en la tienda.
 */
export async function registerForOrderNotifications(askAgain = false): Promise<PushState> {
  if (Platform.OS === 'web') return { status: 'unavailable', reason: 'No disponible en la versión web.' };
  if (!Device.isDevice) return { status: 'unavailable', reason: 'Los avisos solo funcionan en un móvil real.' };
  if (!projectId()) {
    return { status: 'unavailable', reason: 'Falta el projectId de EAS en app.json (se añade con «eas init»).' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pedidos', {
      name: 'Pedidos nuevos',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      lightColor: colors.brand,
      vibrationPattern: [0, 250, 250, 250]
    });
  }

  let { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && (canAskAgain || askAgain)) {
    ({ status, canAskAgain } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return { status: 'denied' };

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
  } catch (e) {
    // Expo Go en Android no admite avisos remotos: hace falta la app compilada.
    return { status: 'unavailable', reason: `No se pudo obtener el token del móvil: ${(e as Error).message}` };
  }
  await request('/api/mobile/pushTokens', { method: 'POST', json: { token, platform: Platform.OS } });
  registeredToken = token;
  return { status: 'enabled' };
}

/** Al cerrar sesión, el móvil deja de recibir avisos (si falla, la tienda lo limpia cuando Expo lo rechace). */
export async function unregisterOrderNotifications() {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await request('/api/mobile/pushTokens/remove', { method: 'POST', json: { token } }).catch(() => {});
}

export const openNotificationSettings = () => Linking.openSettings();

/** uuid del pedido al que apunta un aviso, si lo hay. */
export function orderUuidFrom(response: Notifications.NotificationResponse | null | undefined): string | null {
  const uuid = response?.notification.request.content.data?.orderUuid;
  return typeof uuid === 'string' ? uuid : null;
}
