import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function RootLayoutNav() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === 'auth';
    const inTabs = segments[0] === '(tabs)';

    if (!session && !inAuth) {
      router.replace('/auth/login');
    } else if (session && !profile && !inAuth) {
      router.replace('/auth/onboarding');
    } else if (session && profile && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, profile, loading, segments]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/onboarding" />
        <Stack.Screen name="auth/setup-startup" />
        <Stack.Screen name="auth/setup-investor" />
        <Stack.Screen name="admin/dashboard" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="startup/[id]" />
        <Stack.Screen name="settings/edit-profile" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
