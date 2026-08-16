import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { TransactionRow } from '@/components/home/TransactionRow';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { DoubleRule } from '@/components/ui/DoubleRule';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { cardShadow, colors } from '@/constants/theme';
import { generateAndShareCSV } from '@/services/exportService';
import { useTransactionStore } from '@/store/useTransactionStore';
import { haptics } from '@/utils/haptics';

export default function TaxHubScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const transactions = useTransactionStore((state) => state.transactions);
  const [isCompiling, setIsCompiling] = useState(false);

  const deductibleTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.isDeductible),
    [transactions],
  );
  const totalDeductions = useMemo(
    () => deductibleTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    [deductibleTransactions],
  );

  const handleCompile = async () => {
    if (isCompiling) {
      return;
    }
    if (deductibleTransactions.length === 0) {
      Alert.alert('Nothing to compile', "We haven't flagged any deductible transactions yet.");
      return;
    }
    haptics.impact();
    setIsCompiling(true);
    try {
      await generateAndShareCSV(deductibleTransactions, 'Tax_Export.csv');
      haptics.success();
    } catch (error) {
      haptics.error();
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: tabBarHeight + 24 }} showsVerticalScrollIndicator={false}>
        <FadeSlideIn className="mb-6">
          <Text className="font-body text-sm text-muted-foreground">Tax value, all year</Text>
          <Text className="mt-0.5 font-display-bold text-[30px] tracking-[-0.6px] text-foreground">Tax Assistant</Text>
        </FadeSlideIn>

        <FadeSlideIn delay={60}>
          <SummaryCard total={totalDeductions} count={deductibleTransactions.length} />
        </FadeSlideIn>

        <FadeSlideIn delay={120}>
          <AnimatedPressable
            className={`mt-6 flex-row items-center justify-center gap-2 rounded-lg bg-gold py-4 ${isCompiling ? 'opacity-70' : ''}`}
            style={{ shadowColor: colors.gold, shadowRadius: 12, shadowOpacity: 0.22, shadowOffset: { width: 0, height: 4 } }}
            onPress={handleCompile}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <ActivityIndicator color={colors.goldForeground} />
            ) : (
              <Ionicons name="document-attach-outline" size={18} color={colors.goldForeground} />
            )}
            <Text className="font-body-bold text-[15px] text-gold-foreground">
              {isCompiling ? 'Compiling…' : 'Compile for Accountant'}
            </Text>
          </AnimatedPressable>
        </FadeSlideIn>

        <FadeSlideIn delay={160} className="mb-2 mt-8">
          <Text className="font-body-semibold text-base text-foreground">Flagged transactions</Text>
        </FadeSlideIn>

        {deductibleTransactions.length === 0 ? (
          <FadeSlideIn delay={200} className="items-center justify-center gap-1 rounded-lg border border-border bg-card px-6 py-8">
            <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
            <Text className="mt-1 font-body-semibold text-[15px] text-foreground">No deductions yet</Text>
            <Text className="text-center font-body text-[13px] leading-[18px] text-muted-foreground">
              Scan a receipt or import your inbox — we&apos;ll flag business expenses automatically.
            </Text>
          </FadeSlideIn>
        ) : (
          <FadeSlideIn delay={200} className="rounded-lg border border-border bg-card px-4" distance={12}>
            {deductibleTransactions.map((transaction, index) => (
              <Box key={transaction.id}>
                {index > 0 && <Box className="h-px bg-border" />}
                <TransactionRow
                  transaction={transaction}
                  onPress={() => router.push(`/transactions/${transaction.id}`)}
                />
              </Box>
            ))}
          </FadeSlideIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SummaryCardProps {
  total: number;
  count: number;
}

function SummaryCard({ total, count }: SummaryCardProps) {
  return (
    <Box className="items-center rounded-lg border border-border bg-card p-6" style={cardShadow}>
      <Text className="font-mono text-[11px] tracking-[1px] text-muted-foreground">TOTAL POTENTIAL DEDUCTIONS</Text>
      <AnimatedCurrency
        value={total}
        delay={100}
        className="mt-2 font-display-bold text-[44px] tracking-[-1px] text-gold"
      />
      <DoubleRule className="self-center" />
      <Text className="mt-3 font-body text-[13px] text-secondary-foreground">
        {count} flagged {count === 1 ? 'transaction' : 'transactions'} this year
      </Text>
    </Box>
  );
}
