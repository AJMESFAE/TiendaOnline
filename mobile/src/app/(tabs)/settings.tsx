import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, Row, SectionTitle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

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
  note: { color: colors.inkSoft, fontSize: 13, marginBottom: space(6), lineHeight: 19 },
  version: { color: colors.inkMute, fontSize: 12, textAlign: 'center', marginTop: space(4) }
});
