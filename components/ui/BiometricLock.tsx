import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

const FADE_DURATION_MS = 380;

interface BiometricLockProps {
  children: ReactNode;
}

/**
 * Full-screen local gate mounted around the whole app. Purely on-device — this never touches the
 * network, it only asks the OS "is whoever is holding this phone allowed to see it" via Face ID /
 * Touch ID / Fingerprint, with a device PIN/passcode fallback baked into expo-local-authentication
 * itself (`disableDeviceFallback` left `false`, the default fallback path on both platforms).
 * Independent of services/authService.ts's silent Supabase sign-in, which authenticates the device
 * to the *backend* rather than the person to the *device*.
 *
 * Devices with no biometric hardware, or hardware nobody has enrolled a face/fingerprint into, skip
 * straight to unlocked — this is meant to keep a phone left unattended in someone's pocket from
 * being all it takes to open the ledger, not to force every user to configure Face ID first.
 */
export function BiometricLock({ children }: BiometricLockProps) {
  const [isLockVisible, setIsLockVisible] = useState(true);
  const [isPrompting, setIsPrompting] = useState(false);
  const opacity = useSharedValue(1);

  const unlock = useCallback(() => {
    // Sheet-close pattern reused from ReceiptConfirmationModal: keep the lock screen mounted
    // through the fade so it's a visible dismissal, not a hard cut, then unmount once settled.
    opacity.value = withTiming(0, { duration: FADE_DURATION_MS }, (finished) => {
      if (finished) {
        runOnJS(setIsLockVisible)(false);
      }
    });
  }, [opacity]);

  const attemptUnlock = useCallback(async () => {
    setIsPrompting(true);
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);

      if (!hasHardware || !isEnrolled) {
        unlock();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Expense Management',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        haptics.success();
        unlock();
      }
      // A failed/cancelled attempt just leaves the lock screen up — "Tap to Unlock" re-triggers
      // this same flow for the cases where the automatic OS prompt got dismissed.
    } finally {
      setIsPrompting(false);
    }
  }, [unlock]);

  useEffect(() => {
    attemptUnlock();
    // App-launch gate — fires once on mount, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lockStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Box className="flex-1">
      {children}
      {isLockVisible && (
        <Animated.View style={[StyleSheet.absoluteFill, lockStyle]}>
          <LinearGradient colors={[colors.primary, colors.void]} style={StyleSheet.absoluteFill} />
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

          <Box className="flex-1 items-center justify-center gap-6 px-10">
            <Box
              className="h-20 w-20 items-center justify-center rounded-full border border-glass/30 bg-glass/[0.08]"
              style={{ shadowColor: colors.gold, shadowRadius: 20, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 } }}
            >
              <Ionicons name="lock-closed" size={32} color={colors.glass} />
            </Box>

            <Box className="items-center gap-1.5">
              <Text className="font-display-semibold text-[19px] text-glass">Locked</Text>
              <Text className="text-center font-body text-[13px] leading-[18px] text-glass/70">
                Use Face ID or your passcode to view your finances
              </Text>
            </Box>

            <AnimatedPressable
              className="mt-2 flex-row items-center gap-2 rounded-lg border border-glass/25 bg-glass/[0.12] px-6 py-3.5"
              onPress={attemptUnlock}
              disabled={isPrompting}
            >
              <Ionicons name="finger-print" size={18} color={colors.glass} />
              <Text className="font-body-semibold text-[15px] text-glass">{isPrompting ? 'Verifying…' : 'Tap to Unlock'}</Text>
            </AnimatedPressable>
          </Box>
        </Animated.View>
      )}
    </Box>
  );
}
