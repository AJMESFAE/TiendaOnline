import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Field } from '@/components/ui';
import { getLastLogin } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, space } from '@/lib/theme';

const DEFAULT_URL: string = Constants.expoConfig?.extra?.defaultStoreUrl ?? '';

export default function Login() {
  const { signIn } = useAuth();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLastLogin().then((last) => {
      if (last) {
        setBaseUrl(last.baseUrl);
        setEmail(last.email);
      }
    });
  }, []);

  const submit = async () => {
    if (!baseUrl.trim() || !email.trim() || !password) {
      setError('Rellene la dirección de la tienda, el email y la contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(baseUrl, email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image source={require('../../assets/logo-fundacion-blanco.png')} style={styles.logo} contentFit="contain" />
            <Text style={styles.title}>Gestión de la tienda</Text>
            <Text style={styles.subtitle}>Pedidos, artículos y stock desde el móvil</Text>
          </View>
          <Card>
            <Field
              label="Dirección de la tienda"
              value={baseUrl}
              onChangeText={setBaseUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://tienda.fundacionandalusi.org"
            />
            <Field
              label="Email del administrador"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Entrar" onPress={submit} loading={loading} />
          </Card>
          <Text style={styles.footnote}>Use el mismo usuario que en el panel web (/admin).</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.brand },
  container: { flexGrow: 1, justifyContent: 'center', padding: space(5) },
  header: { alignItems: 'center', marginBottom: space(6) },
  logo: { width: 220, height: 80, marginBottom: space(4) },
  title: { fontSize: 24, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 15, color: colors.brandSoft, marginTop: space(1) },
  error: { color: colors.danger, marginBottom: space(3), fontSize: 14 },
  footnote: { color: colors.brandSoft, textAlign: 'center', marginTop: space(2), fontSize: 13 }
});
