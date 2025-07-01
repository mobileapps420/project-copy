import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import AuthScreen from '@/components/AuthScreen';

export default function RootLayout() {
  useFrameworkReady();
  const { user, loading } = useAuth();

  // Handle platform-specific initialization
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Mobile-specific initialization
      console.log('CarDiag AI Pro - Mobile platform detected');
    }
  }, []);

  if (loading) {
    return null; // Or a loading screen
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" backgroundColor="#1E293B" />
    </>
  );
}