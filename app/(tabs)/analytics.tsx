import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';

import { AiWidget } from '@/components/ai/AiWidget';
import { CashFlowChart } from '@/components/charts/CashFlowChart';
import { NetWorthCard } from '@/components/charts/NetWorthCard';
import { SpendingChart } from '@/components/charts/SpendingChart';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { mockBalanceSheet, mockCashFlow, mockQuickPrompts, mockSpendingCategories } from '@/data/mockAnalytics';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { computeCashFlowSummary, computeSpendingCategories, EMPTY_BALANCE_SHEET, resolveSummaryMonth } from '@/utils/analytics';

export default function AnalyticsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const useMockData = useOnboardingStore((state) => state.useMockData);
  const transactions = useTransactionStore((state) => state.transactions);

  // Same fallback Home uses: summarize the real current month if it has data, otherwise the most
  // recent month that does, so this agrees with the Home screen's Net card about which month
  // "this month" actually means.
  const summaryMonth = useMemo(() => resolveSummaryMonth(transactions), [transactions]);
  // Recomputed from the live transaction list in real-data mode, so the charts track every
  // scan/manual entry instead of only ever showing the mock demo numbers or a static empty state.
  const spendingCategories = useMemo(
    () => (useMockData ? mockSpendingCategories : computeSpendingCategories(transactions, summaryMonth)),
    [useMockData, transactions, summaryMonth],
  );
  const cashFlow = useMemo(
    () => (useMockData ? mockCashFlow : computeCashFlowSummary(transactions, summaryMonth)),
    [useMockData, transactions, summaryMonth],
  );
  // Net worth isn't derivable from a transaction list (no account-balance data exists anywhere in
  // this app) — real-data mode always passes the honest "nothing tracked" shape rather than a
  // fabricated number, and NetWorthCard itself only ever renders in mock mode below.
  const balanceSheet = useMockData ? mockBalanceSheet : EMPTY_BALANCE_SHEET;
  const hasAnalyticsToShow = useMockData || spendingCategories.length > 0 || cashFlow.totalIncome > 0 || cashFlow.totalOutflow > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <FadeSlideIn className="mb-6">
          <Text className="font-body text-sm text-muted-foreground">Financial health</Text>
          <Text className="mt-0.5 font-display-bold text-[30px] tracking-[-0.6px] text-foreground">Analytics & Insights</Text>
        </FadeSlideIn>

        {hasAnalyticsToShow ? (
          <>
            <FadeSlideIn delay={60}>
              <AiWidget
                prompts={mockQuickPrompts}
                spendingCategories={spendingCategories}
                cashFlow={cashFlow}
                balanceSheet={balanceSheet}
              />
            </FadeSlideIn>

            <FadeSlideIn delay={120} className="mt-6">
              <SpendingChart categories={spendingCategories} />
            </FadeSlideIn>

            <FadeSlideIn delay={180} className="mt-6">
              <CashFlowChart cashFlow={cashFlow} />
            </FadeSlideIn>

            {useMockData && (
              <FadeSlideIn delay={240} className="mt-6">
                <NetWorthCard balanceSheet={mockBalanceSheet} />
              </FadeSlideIn>
            )}
          </>
        ) : (
          <FadeSlideIn delay={60} className="mt-2 items-center rounded-lg border border-border bg-card px-6 py-16">
            <Ionicons name="bar-chart-outline" size={32} color={colors.textMuted} />
            <Box className="mt-4">
              <Text className="text-center font-body-medium text-[15px] text-foreground">No analytics yet</Text>
              <Text className="mt-1 text-center font-body text-[13px] text-muted-foreground">
                Add transactions to see spending breakdowns and cash flow here.
              </Text>
            </Box>
          </FadeSlideIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
