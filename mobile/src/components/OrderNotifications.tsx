import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { orderUuidFrom, registerForOrderNotifications } from '@/lib/notifications';

/**
 * Con la sesión abierta: registra el móvil para los avisos de pedido nuevo,
 * abre el pedido al tocar un aviso (también si la app estaba cerrada) y
 * refresca las listas cuando llega uno con la app abierta.
 */
export function OrderNotifications() {
  const queryClient = useQueryClient();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    registerForOrderNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    const uuid = orderUuidFrom(lastResponse);
    const id = lastResponse?.notification.request.identifier ?? null;
    if (!uuid || handled.current === id) return;
    handled.current = id;
    router.push({ pathname: '/order/[uuid]', params: { uuid } });
  }, [lastResponse]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['lifetimesales'] });
      queryClient.invalidateQueries({ queryKey: ['salestatistic'] });
    });
    return () => sub.remove();
  }, [queryClient]);

  return null;
}
