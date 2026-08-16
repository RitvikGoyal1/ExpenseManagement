import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { GradientText } from '@/components/ui/GradientText';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import { MOCK_IMPORT_COUNT, simulateInboxImport } from '@/services/emailImportService';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { haptics } from '@/utils/haptics';

const SYNC_STEPS = [
  'Connecting to your inbox',
  'Scanning inbox for receipts',
  `Categorizing ${MOCK_IMPORT_COUNT} past transactions`,
];

const STEP_INTERVAL_MS = 1100;

export default function ImportScreen() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const importTransactions = useTransactionStore((state) => state.importTransactions);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);

  useEffect(() => {
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, []);

  const handleConnect = useCallback(async () => {
    if (isSyncing) {
      return;
    }
    haptics.impact(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    setActiveStep(0);

    let step = 0;
    stepIntervalRef.current = setInterval(() => {
      if (step >= SYNC_STEPS.length - 1) {
        if (stepIntervalRef.current) {
          clearInterval(stepIntervalRef.current);
        }
        return;
      }
      step += 1;
      haptics.impact(Haptics.ImpactFeedbackStyle.Light);
      setActiveStep(step);
    }, STEP_INTERVAL_MS);

    const transactions = await simulateInboxImport();

    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
    }

    haptics.success();

    // Populates the dashboard, then flips the onboarding flag — the root
    // layout's Stack.Protected guard reacts to that and swaps the whole
    // onboarding stack out for the main tabs, so this screen and its
    // history are gone, not just navigated past.
    importTransactions(transactions);
    completeOnboarding();
  }, [completeOnboarding, importTransactions, isSyncing]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Box className="flex-1 px-8 pt-6">
        <FadeSlideIn className="mb-8 flex-row gap-1">
          <Box className="h-1 w-7 rounded-full bg-primary" />
          <Box className="h-1 w-7 rounded-full bg-primary" />
        </FadeSlideIn>

        <FadeSlideIn delay={40}>
          <Box className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-primary/16">
            <Ionicons name="mail-open-outline" size={32} color={colors.primary} />
          </Box>

          <GradientText className="font-display-bold text-[28px] leading-[34px] tracking-[-0.5px] text-foreground">
            Let&apos;s find your past digital receipts.
          </GradientText>
          <Text className="mt-2 font-body text-base leading-[22px] text-secondary-foreground">
            Connect your inbox and we&apos;ll automatically import receipts from the last 3 months, so
            your dashboard starts full instead of empty.
          </Text>
        </FadeSlideIn>

        <Box className="min-h-8 flex-1" />

        {isSyncing ? (
          <FadeSlideIn className="rounded-lg border border-border bg-card p-6">
            <Box className="gap-4">
              {SYNC_STEPS.map((step, index) => {
                const status = index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending';
                return <SyncStepRow key={step} label={step} status={status} />;
              })}
            </Box>
          </FadeSlideIn>
        ) : (
          <FadeSlideIn>
            <AnimatedPressable
              className="flex-row items-center justify-center gap-2 rounded-lg bg-primary py-[18px]"
              style={{ shadowColor: colors.primary, shadowRadius: 14, shadowOpacity: 0.22, shadowOffset: { width: 0, height: 5 } }}
              onPress={handleConnect}
            >
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              <Text className="font-body-bold text-[17px] text-glass">Connect Gmail / Outlook</Text>
            </AnimatedPressable>

            <Box className="mt-4 flex-row items-center justify-center gap-1.5">
              <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
              <Text className="font-body text-xs text-muted-foreground">We only scan for receipts. Your password is never stored.</Text>
            </Box>
          </FadeSlideIn>
        )}
      </Box>
    </SafeAreaView>
  );
}

interface SyncStepRowProps {
  label: string;
  status: 'done' | 'active' | 'pending';
}

function SyncStepRow({ label, status }: SyncStepRowProps) {
  return (
    <Box className="flex-row items-center">
      <Box className="mr-4 h-6 w-6 items-center justify-center">
        {status === 'done' && <DoneCheckmark />}
        {status === 'active' && <ActivityIndicator size="small" color={colors.primary} />}
        {status === 'pending' && <Box className="h-2.5 w-2.5 rounded-full bg-border" />}
      </Box>
      <Text className={`text-[15px] ${status === 'pending' ? 'font-body-medium text-muted-foreground' : 'font-body-semibold text-foreground'}`}>
        {label}
      </Text>
    </Box>
  );
}

function DoneCheckmark() {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, springs.bouncy);
  }, [pop]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={popStyle}>
      <Ionicons name="checkmark-circle" size={22} color={colors.income} />
    </Animated.View>
  );
}
