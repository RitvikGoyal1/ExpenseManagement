import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { PeriodSelector } from '@/components/home/PeriodSelector';
import { TrendBadge } from '@/components/home/TrendBadge';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
import { Box } from '@/components/ui/box';
import { DoubleRule } from '@/components/ui/DoubleRule';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { cardShadow, colors } from '@/constants/theme';
import { PeriodSummary, SummaryPeriod } from '@/types/transaction';
import { formatCurrency } from '@/utils/format';

const NET_LABELS: Record<SummaryPeriod, string> = {
  week: 'Net this week',
  month: 'Net this month',
  year: 'Net this year',
  all: 'Net all time',
};

interface MonthSummaryCardProps {
  summary: PeriodSummary;
  period: SummaryPeriod;
  onPeriodChange: (period: SummaryPeriod) => void;
}

export function MonthSummaryCard({ summary, period, onPeriodChange }: MonthSummaryCardProps) {
  const { label, income, expenses, previousExpenses, hasComparison } = summary;
  const net = income - expenses;
  const changePercent =
    hasComparison && previousExpenses > 0 ? ((expenses - previousExpenses) / previousExpenses) * 100 : 0;
  // Spending less than last period is the good outcome, regardless of sign.
  const spentLessThanLastPeriod = changePercent < 0;
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
      <PeriodSelector value={period} onChange={onPeriodChange} />

      <Box className="mt-4 flex-row items-center justify-between">
        <Text className="font-mono-medium text-[11px] tracking-[1.4px] text-muted-foreground">{label.toUpperCase()}</Text>
        {hasComparison && (
          <TrendBadge
            percent={Math.abs(changePercent)}
            direction={spentLessThanLastPeriod ? 'down' : 'up'}
            positive={spentLessThanLastPeriod}
          />
        )}
      </Box>

      <Text className="mt-4 font-body text-[13px] text-muted-foreground">{NET_LABELS[period]}</Text>
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
