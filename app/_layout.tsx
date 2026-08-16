import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaListener } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Uniwind } from 'uniwind';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { colors } from '@/constants/theme';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hasCompletedOnboarding = useOnboardingStore((state) => state.hasCompletedOnboarding);

  const [fontsLoaded, fontError] = useFonts({
    // On iOS fonts are resolved by their PostScript name (hyphenated), not the
    // @expo-google-fonts export name (underscored). Register under the real
    // names so the `fontFamily` values in global.css match on every platform.
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'JetBrainsMono-Regular': JetBrainsMono_400Regular,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'JetBrainsMono-SemiBold': JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.void }}>
        <GluestackUIProvider mode="light">
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.void } }}>
            <Stack.Protected guard={!hasCompletedOnboarding}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={hasCompletedOnboarding}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="transactions" options={{ animation: 'slide_from_right' }} />
            </Stack.Protected>
          </Stack>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
