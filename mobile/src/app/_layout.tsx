import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

function RootStack() {
  const { ready, session } = useAuth();
  if (!ready) return <Loading />;
  const signedIn = Boolean(session);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.brandInk,
        headerTitleStyle: { color: colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.smoke }
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[uuid]" options={{ title: 'Pedido' }} />
        <Stack.Screen name="product/new" options={{ title: 'Nuevo artículo', presentation: 'modal' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Editar artículo' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2
          }
        }
      })
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootStack />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
