import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { TrendBadge } from '@/components/home/TrendBadge';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
import { Box } from '@/components/ui/box';
import { DoubleRule } from '@/components/ui/DoubleRule';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { cardShadow, colors } from '@/constants/theme';
import { MonthlySummary } from '@/types/transaction';
import { formatCurrency } from '@/utils/format';

interface MonthSummaryCardProps {
  summary: MonthlySummary;
}

export function MonthSummaryCard({ summary }: MonthSummaryCardProps) {
  const { month, income, expenses, previousMonthExpenses } = summary;
  const net = income - expenses;
  const changePercent = ((expenses - previousMonthExpenses) / previousMonthExpenses) * 100;
  // Spending less than last month is the good outcome, regardless of sign.
  const spentLessThanLastMonth = changePercent < 0;
  const spentRatio = income > 0 ? Math.min(expenses / income, 1) : 0;
  const netTint = net >= 0 ? colors.income : colors.expense;

  const progress = useSharedValue(0);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      progress.value = withDelay(250, withSpring(1, springs.default));
    });
    return () => task.cancel();
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * spentRatio * 100}%`,
  }));

  return (
    <Box className="rounded-lg border border-border bg-card p-6" style={cardShadow}>
      <Box className="flex-row items-center justify-between">
        <Text className="font-mono-medium text-[11px] tracking-[1.4px] text-muted-foreground">{month.toUpperCase()}</Text>
        <TrendBadge
          percent={Math.abs(changePercent)}
          direction={spentLessThanLastMonth ? 'down' : 'up'}
          positive={spentLessThanLastMonth}
        />
      </Box>

      <Text className="mt-4 font-body text-[13px] text-muted-foreground">Net this month</Text>
      <AnimatedCurrency
        value={net}
        delay={100}
        className="mt-1 font-display-bold text-[42px] tracking-[-1px]"
        style={{ color: netTint }}
      />
      <DoubleRule />

      <Box className="mt-6 h-2 overflow-hidden rounded-full bg-border">
        <Animated.View style={[{ height: '100%', borderRadius: 999, backgroundColor: colors.primary }, progressStyle]} />
      </Box>

      <Box className="mt-6 flex-row border-t border-border pt-4">
        <Box className="flex-1">
          <Text className="mb-1 font-mono text-[10px] tracking-[0.8px] text-muted-foreground">INCOME</Text>
          <Text className="font-mono-semibold text-base text-income">{formatCurrency(income)}</Text>
        </Box>
        <Box className="mx-4 w-px bg-border" />
        <Box className="flex-1">
          <Text className="mb-1 font-mono text-[10px] tracking-[0.8px] text-muted-foreground">SPENT</Text>
          <Text className="font-mono-semibold text-base text-destructive">{formatCurrency(expenses)}</Text>
        </Box>
      </Box>
    </Box>
  );
}
