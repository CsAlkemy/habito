import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/data/store';
import { DATABASE_NAME, migrate } from '@/db/schema';
import { useNotificationDeepLinks } from '@/lib/notify';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      <SafeAreaProvider>
        <StoreProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}

function App() {
  const [fontsLoaded] = useFonts({
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const { hydrated } = useStore();
  const { colors, dark } = useTheme();

  // The splash stays up until the database has been read as well as the fonts.
  // Routing depends on the persisted `onboarded` flag, so rendering earlier
  // would show onboarding for a frame to someone who finished it months ago.
  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Tapping a reminder opens that habit's check-in; the recap opens the recap.
  useNotificationDeepLinks(ready);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.ground },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="check-in/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="skip/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habit/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="milestone" options={{ animation: 'fade' }} />
        <Stack.Screen name="widget" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="recap" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="lock-screen" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}
