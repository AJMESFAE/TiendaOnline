import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { openNotificationSettings, PushState, registerForOrderNotifications } from '@/lib/notifications';
import { colors, space } from '@/lib/theme';

function OrderAlerts() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerForOrderNotifications()
      .then(setState)
      .catch((e) => setState({ status: 'unavailable', reason: e.message }));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const next = await registerForOrderNotifications(true);
      setState(next);
      if (next.status === 'denied') openNotificationSettings();
    } catch (e) {
      setState({ status: 'unavailable', reason: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const label =
    state === null ? 'Comprobando…' : state.status === 'enabled' ? 'Activados' : state.status === 'denied' ? 'Sin permiso' : 'No disponibles';
  return (
    <Card>
      <Row label="Avisos de pedidos nuevos" value={label} />
      {state?.status === 'enabled' ? (
        <Text style={styles.hint}>Este móvil recibe un aviso cada vez que se confirma un pedido en la tienda.</Text>
      ) : null}
      {state?.status === 'unavailable' ? <Text style={styles.hint}>{state.reason}</Text> : null}
      {state?.status === 'denied' ? (
        <>
          <Text style={styles.hint}>Permita las notificaciones de la app en los ajustes del teléfono.</Text>
          <Button title="Activar avisos" onPress={enable} loading={busy} style={{ marginTop: space(3) }} />
        </>
      ) : null}
    </Card>
  );
}

export default function Settings() {
  const { session, signOut } = useAuth();
  const confirmSignOut = () =>
    Alert.alert('Cerrar sesión', '¿Quiere cerrar la sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() }
    ]);

  return (
    <ScrollView contentContainerStyle={{ padding: space(4) }}>
      <SectionTitle>Tienda conectada</SectionTitle>
      <Card>
        <Row label="Dirección" value={session?.baseUrl.replace(/^https?:\/\//, '')} />
        <Row label="Usuario" value={session?.email} />
      </Card>
      <SectionTitle>Avisos</SectionTitle>
      <OrderAlerts />
      <Card>
        <Button
          title="Abrir el panel web"
          variant="secondary"
          onPress={() => session && Linking.openURL(`${session.baseUrl}/admin`)}
          style={{ marginBottom: space(3) }}
        />
        <Button
          title="Ver la tienda"
          variant="secondary"
          onPress={() => session && Linking.openURL(session.baseUrl)}
        />
      </Card>
      <Text style={styles.note}>
        Desde el panel web se gestionan además los clientes, los cupones, las zonas de envío, los impuestos y el diseño de la tienda.
      </Text>
      <Button title="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
      <Text style={styles.version}>Versión {Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.inkMute, fontSize: 13, marginTop: space(1), lineHeight: 18 },
  note: { color: colors.inkSoft, fontSize: 13, marginBottom: space(6), lineHeight: 19 },
  version: { color: colors.inkMute, fontSize: 12, textAlign: 'center', marginTop: space(4) }
});
