import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { generateAndShareCSV } from '@/services/exportService';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { IncomeType } from '@/types/onboarding';
import { haptics } from '@/utils/haptics';

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salaried: 'Salaried',
  freelancer: 'Freelancer',
  'business-owner': 'Business Owner',
};

export default function SettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const transactions = useTransactionStore((state) => state.transactions);
  const resetTransactions = useTransactionStore((state) => state.resetTransactions);
  const incomeType = useOnboardingStore((state) => state.incomeType);
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);

  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) {
      return;
    }
    if (transactions.length === 0) {
      Alert.alert('Nothing to export', 'Add a transaction first — scan a receipt or import your inbox.');
      return;
    }
    haptics.impact();
    setIsExporting(true);
    try {
      await generateAndShareCSV(transactions, 'Transaction_History.csv');
      haptics.success();
    } catch (error) {
      haptics.error();
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset app data?',
      "This clears every transaction and takes you back through setup. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            haptics.error();
            resetTransactions();
            resetOnboarding();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <FadeSlideIn>
          <Text className="mb-6 font-display-bold text-[30px] tracking-[-0.6px] text-foreground">Settings</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={40}>
          <SectionLabel label="PROFILE" />
          <Box className="rounded-lg border border-border bg-card px-4">
            <Box className="flex-row items-center gap-4 py-4">
              <Box className="h-10 w-10 items-center justify-center rounded-full bg-primary/16">
                <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              </Box>
              <Box className="flex-1">
                <Text className="font-body-medium text-[15px] text-foreground">Employment Type</Text>
                <Text className="mt-0.5 font-body text-[13px] text-muted-foreground">
                  {incomeType ? INCOME_TYPE_LABELS[incomeType] : 'Not set'}
                </Text>
              </Box>
            </Box>
          </Box>
        </FadeSlideIn>

        <FadeSlideIn delay={80} className="mt-8">
          <SectionLabel label="PREFERENCES" />
          <Box className="rounded-lg border border-border bg-card px-4">
            <PreferenceRow
              icon="finger-print-outline"
              label="Biometric Authentication"
              value={biometricEnabled}
              onValueChange={(value) => {
                haptics.selection();
                setBiometricEnabled(value);
              }}
            />
            <Box className="h-px bg-border" />
            <PreferenceRow
              icon="notifications-outline"
              label="Push Notifications"
              value={pushEnabled}
              onValueChange={(value) => {
                haptics.selection();
                setPushEnabled(value);
              }}
            />
          </Box>
        </FadeSlideIn>

        <FadeSlideIn delay={120} className="mt-8">
          <SectionLabel label="DATA & PRIVACY" />

          <AnimatedPressable
            className={`flex-row items-center justify-center gap-2 rounded-lg bg-primary py-4 ${isExporting ? 'opacity-70' : ''}`}
            style={{ shadowColor: colors.primary, shadowRadius: 12, shadowOpacity: 0.22, shadowOffset: { width: 0, height: 4 } }}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="document-attach-outline" size={18} color="#FFFFFF" />
            )}
            <Text className="font-body-bold text-[15px] text-glass">
              {isExporting ? 'Exporting…' : 'Export Full History (CSV)'}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            className="mt-3 flex-row items-center justify-center gap-2 rounded-lg border border-destructive bg-destructive/[0.08] py-4"
            onPress={handleReset}
          >
            <Ionicons name="trash-outline" size={18} color={colors.expense} />
            <Text className="font-body-semibold text-[15px] text-destructive">Reset App Data</Text>
          </AnimatedPressable>
        </FadeSlideIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">{label}</Text>;
}

interface PreferenceRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function PreferenceRow({ icon, label, value, onValueChange }: PreferenceRowProps) {
  return (
    <Box className="flex-row items-center gap-4 py-3.5">
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text className="flex-1 font-body-medium text-[15px] text-foreground">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primarySoft }}
        thumbColor={value ? colors.primary : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </Box>
  );
}
