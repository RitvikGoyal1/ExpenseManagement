import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { MonthSummaryCard } from '@/components/home/MonthSummaryCard';
import { TransactionFilters } from '@/components/home/TransactionFilters';
import { TransactionRow } from '@/components/home/TransactionRow';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { mockPeriodSummaries } from '@/data/mockTransactions';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { SummaryPeriod } from '@/types/transaction';
import { computeSummary, resolveSummaryReference } from '@/utils/analytics';
import { useTransactionFilters } from '@/utils/useTransactionFilters';

// Caps the stagger so a long, freshly-imported list doesn't take forever to
// finish cascading in — later rows just join at the same final beat.
const MAX_STAGGERED_ROWS = 8;
const ROW_STAGGER_MS = 45;

export default function HomeScreen() {
  const transactions = useTransactionStore((state) => state.transactions);
  const useMockData = useOnboardingStore((state) => state.useMockData);
  const [period, setPeriod] = useState<SummaryPeriod>('month');
  // Falls back to the most recent bucket that actually has transactions when the real current
  // one doesn't — otherwise a device with only past-dated data (old receipts, a backdated manual
  // entry) would show a correctly-computed but permanently useless "$0.00 this month".
  const summaryReference = useMemo(() => resolveSummaryReference(transactions, period), [transactions, period]);
  // Recomputed from the live transaction list, not a static snapshot — this is what makes "Net
  // this month" track every scan/manual entry as it's added instead of reading zero forever.
  const summary = useMemo(
    () => (useMockData ? mockPeriodSummaries[period] : computeSummary(transactions, period, summaryReference)),
    [useMockData, transactions, period, summaryReference],
  );
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const filters = useTransactionFilters(transactions);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <FadeSlideIn className="mb-6">
          <Text className="font-body text-sm text-muted-foreground">Welcome back</Text>
          <Text className="mt-0.5 font-display-bold text-[30px] tracking-[-0.6px] text-foreground">Your finances</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={60}>
          <MonthSummaryCard summary={summary} period={period} onPeriodChange={setPeriod} />
        </FadeSlideIn>

        <FadeSlideIn delay={120} className="mt-8">
          <TransactionFilters filters={filters} />
        </FadeSlideIn>

        <FadeSlideIn delay={160} className="mb-2 mt-6">
          <Text className="font-body-semibold text-base text-foreground">Recent transactions</Text>
        </FadeSlideIn>

        {filters.filtered.length === 0 && transactions.length > 0 ? (
          <Box className="items-center gap-2 rounded-lg border border-border bg-card px-4 py-10">
            <Ionicons name="search-outline" size={22} color={colors.textMuted} />
            <Text className="font-body-medium text-sm text-muted-foreground">No transactions match these filters.</Text>
          </Box>
        ) : (
          <Box className="rounded-lg border border-border bg-card px-4">
            {filters.filtered.map((transaction, index) => (
              <FadeSlideIn key={transaction.id} delay={200 + Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_MS}>
                {index > 0 && <Box className="h-px bg-border" />}
                <TransactionRow
                  transaction={transaction}
                  onPress={() => router.push(`/transactions/${transaction.id}`)}
                />
              </FadeSlideIn>
            ))}
          </Box>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
