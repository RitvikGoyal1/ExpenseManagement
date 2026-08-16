import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';

import { MonthSummaryCard } from '@/components/home/MonthSummaryCard';
import { TransactionRow } from '@/components/home/TransactionRow';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { mockMonthlySummary } from '@/data/mockTransactions';
import { useTransactionStore } from '@/store/useTransactionStore';

// Caps the stagger so a long, freshly-imported list doesn't take forever to
// finish cascading in — later rows just join at the same final beat.
const MAX_STAGGERED_ROWS = 8;
const ROW_STAGGER_MS = 45;

export default function HomeScreen() {
  const transactions = useTransactionStore((state) => state.transactions);
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <FadeSlideIn className="mb-6">
          <Text className="font-body text-sm text-muted-foreground">Welcome back</Text>
          <Text className="mt-0.5 font-display-bold text-[30px] tracking-[-0.6px] text-foreground">Your finances</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={60}>
          <MonthSummaryCard summary={mockMonthlySummary} />
        </FadeSlideIn>

        <FadeSlideIn delay={140} className="mb-2 mt-8">
          <Text className="font-body-semibold text-base text-foreground">Recent transactions</Text>
        </FadeSlideIn>

        <Box className="rounded-lg border border-border bg-card px-4">
          {transactions.map((transaction, index) => (
            <FadeSlideIn key={transaction.id} delay={180 + Math.min(index, MAX_STAGGERED_ROWS) * ROW_STAGGER_MS}>
              {index > 0 && <Box className="h-px bg-border" />}
              <TransactionRow
                transaction={transaction}
                onPress={() => router.push(`/transactions/${transaction.id}`)}
              />
            </FadeSlideIn>
          ))}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
