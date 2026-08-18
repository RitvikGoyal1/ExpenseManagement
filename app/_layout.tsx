import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { BiometricLock } from "@/components/ui/BiometricLock";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { colors } from "@/constants/theme";
import "@/global.css";
import { initializeAnonymousSession } from "@/services/authService";
import { fetchNetWorthItems, fetchTransactions } from "@/services/databaseService";
import { useNetWorthStore } from "@/store/useNetWorthStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useTransactionStore } from "@/store/useTransactionStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hasCompletedOnboarding = useOnboardingStore(
    (state) => state.hasCompletedOnboarding,
  );
  // hasCompletedOnboarding is read from disk asynchronously (zustand persist), so it's briefly
  // `false` — its create()-time default — on every launch even for a returning user. Gating the
  // splash screen (below) on this too avoids a flash of the onboarding flow before that read
  // resolves and flips it to the real, persisted value.
  const hasOnboardingHydrated = useOnboardingStore((state) => state.hasHydrated);
  const importTransactions = useTransactionStore(
    (state) => state.importTransactions,
  );
  const importNetWorthItems = useNetWorthStore((state) => state.importItems);

  useEffect(() => {
    // Fire-and-forget: silent by design, and independent of BiometricLock's local gate, so it
    // shouldn't block first paint. The Zustand transaction/net-worth stores only ever live in
    // memory, so every cold start needs this to repopulate them from Supabase — a failure here
    // just leaves the lists empty until the next successful sync, nothing for the user to act on
    // at boot.
    (async () => {
      try {
        await initializeAnonymousSession();
        const [transactions, netWorthItems] = await Promise.all([fetchTransactions(), fetchNetWorthItems()]);
        importTransactions(transactions);
        importNetWorthItems(netWorthItems);
      } catch (error) {
        console.warn("[RootLayout] Failed to sync data from Supabase:", error);
      }
    })();
  }, [importTransactions, importNetWorthItems]);

  const [fontsLoaded, fontError] = useFonts({
    // On iOS fonts are resolved by their PostScript name (hyphenated), not the
    // @expo-google-fonts export name (underscored). Register under the real
    // names so the `fontFamily` values in global.css match on every platform.
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    "SpaceGrotesk-SemiBold": SpaceGrotesk_600SemiBold,
    "SpaceGrotesk-Bold": SpaceGrotesk_700Bold,
    "JetBrainsMono-Regular": JetBrainsMono_400Regular,
    "JetBrainsMono-Medium": JetBrainsMono_500Medium,
    "JetBrainsMono-SemiBold": JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && hasOnboardingHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, hasOnboardingHydrated]);

  if ((!fontsLoaded && !fontError) || !hasOnboardingHydrated) {
    return null;
  }

  return (
    <SafeAreaListener onChange={({ insets }) => Uniwind.updateInsets(insets)}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.void }}>
        <GluestackUIProvider mode="light">
          <StatusBar style="dark" />
          <BiometricLock>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
              }}
            >
              <Stack.Protected guard={!hasCompletedOnboarding}>
                <Stack.Screen name="onboarding" />
              </Stack.Protected>
              <Stack.Protected guard={hasCompletedOnboarding}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="transactions"
                  options={{ animation: "slide_from_right" }}
                />
                <Stack.Screen
                  name="legal"
                  options={{ animation: "slide_from_right" }}
                />
              </Stack.Protected>
            </Stack>
          </BiometricLock>
        </GluestackUIProvider>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}
