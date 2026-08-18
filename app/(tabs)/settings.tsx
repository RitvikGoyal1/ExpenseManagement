import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { NetWorthItemModal } from '@/components/settings/NetWorthItemModal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { deleteNetWorthItem } from '@/services/databaseService';
import { generateAndShareCSV } from '@/services/exportService';
import { useNetWorthStore } from '@/store/useNetWorthStore';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { NetWorthItem, NetWorthItemType } from '@/types/analytics';
import { IncomeType } from '@/types/onboarding';
import { formatCurrency } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salaried: 'Salaried',
  freelancer: 'Freelancer',
  'business-owner': 'Business Owner',
};

export default function SettingsScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const transactions = useTransactionStore((state) => state.transactions);
  const resetTransactions = useTransactionStore((state) => state.resetTransactions);
  const incomeType = useOnboardingStore((state) => state.incomeType);
  const resetOnboarding = useOnboardingStore((state) => state.resetOnboarding);
  const netWorthItems = useNetWorthStore((state) => state.items);
  const addNetWorthItem = useNetWorthStore((state) => state.addItem);
  const removeNetWorthItem = useNetWorthStore((state) => state.removeItem);
  const resetNetWorthItems = useNetWorthStore((state) => state.resetItems);

  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [addingItemType, setAddingItemType] = useState<NetWorthItemType | null>(null);

  const assetItems = netWorthItems.filter((item) => item.type === 'asset');
  const liabilityItems = netWorthItems.filter((item) => item.type === 'liability');

  // Optimistic: the row disappears the instant the delete icon is tapped, and re-inserts itself
  // only if the remote delete actually failed — same pattern as TransactionRow's swipe-to-delete.
  const handleDeleteNetWorthItem = (item: NetWorthItem) => {
    haptics.impact();
    removeNetWorthItem(item.id);
    deleteNetWorthItem(item.id).catch((error) => {
      console.warn('[SettingsScreen] Failed to delete net worth item:', error);
      haptics.error();
      addNetWorthItem(item);
      Alert.alert('Delete failed', "We couldn't delete this item. Check your connection and try again.");
    });
  };

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
            resetNetWorthItems();
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
          <SectionLabel label="NET WORTH" />
          <Box className="rounded-lg border border-border bg-card px-4">
            <NetWorthGroup
              label="Assets"
              icon="trending-up-outline"
              color={colors.income}
              items={assetItems}
              onAdd={() => setAddingItemType('asset')}
              onDelete={handleDeleteNetWorthItem}
            />
            <Box className="h-px bg-border" />
            <NetWorthGroup
              label="Liabilities"
              icon="trending-down-outline"
              color={colors.expense}
              items={liabilityItems}
              onAdd={() => setAddingItemType('liability')}
              onDelete={handleDeleteNetWorthItem}
            />
          </Box>
        </FadeSlideIn>

        <FadeSlideIn delay={120} className="mt-8">
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

        <FadeSlideIn delay={160} className="mt-8">
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

        <FadeSlideIn delay={200} className="mt-8">
          <SectionLabel label="LEGAL" />
          <Box className="rounded-lg border border-border bg-card px-4">
            <LinkRow icon="document-text-outline" label="Terms of Service" onPress={() => router.push('/legal/terms')} />
            <Box className="h-px bg-border" />
            <LinkRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
            <Box className="h-px bg-border" />
            <LinkRow icon="shield-checkmark-outline" label="Data Collection & Permissions" onPress={() => router.push('/legal/data')} />
          </Box>
        </FadeSlideIn>
      </ScrollView>

      <NetWorthItemModal
        visible={addingItemType !== null}
        type={addingItemType ?? 'asset'}
        onCancel={() => setAddingItemType(null)}
        onConfirm={(item) => {
          addNetWorthItem(item);
          setAddingItemType(null);
        }}
      />
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">{label}</Text>;
}

interface NetWorthGroupProps {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  items: NetWorthItem[];
  onAdd: () => void;
  onDelete: (item: NetWorthItem) => void;
}

function NetWorthGroup({ label, icon, color, items, onAdd, onDelete }: NetWorthGroupProps) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Box className="py-3.5">
      <Box className="flex-row items-center gap-4">
        <Ionicons name={icon} size={20} color={colors.textSecondary} />
        <Text className="flex-1 font-body-medium text-[15px] text-foreground">{label}</Text>
        <Text className="font-mono-medium text-[13px]" style={{ color }}>
          {formatCurrency(total)}
        </Text>
      </Box>

      {items.length > 0 && (
        <Box className="mt-3 gap-2.5 pl-9">
          {items.map((item) => (
            <Box key={item.id} className="flex-row items-center justify-between">
              <Text className="shrink font-body text-[13px] text-secondary-foreground" numberOfLines={1}>
                {item.label}
              </Text>
              <Box className="flex-row items-center gap-3">
                <Text className="font-mono text-[13px] text-foreground">{formatCurrency(item.amount)}</Text>
                <AnimatedPressable onPress={() => onDelete(item)} hitSlop={8} scaleTo={0.85}>
                  <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} />
                </AnimatedPressable>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <AnimatedPressable onPress={onAdd} className="mt-3 flex-row items-center gap-1.5 pl-9" scaleTo={0.97}>
        <Ionicons name="add-circle-outline" size={16} color={color} />
        <Text className="font-body-medium text-[13px]" style={{ color }}>
          {label === 'Assets' ? 'Add asset' : 'Add liability'}
        </Text>
      </AnimatedPressable>
    </Box>
  );
}

interface LinkRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

function LinkRow({ icon, label, onPress }: LinkRowProps) {
  return (
    <AnimatedPressable className="flex-row items-center gap-4 py-3.5" onPress={onPress} scaleTo={0.98}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text className="flex-1 font-body-medium text-[15px] text-foreground">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </AnimatedPressable>
  );
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
