import { StyleSheet, Text, View } from 'react-native';

import { TrendBadge } from '@/components/home/TrendBadge';
import { colors, radii, spacing } from '@/constants/theme';
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

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.month}>{month}</Text>
        <TrendBadge
          percent={Math.abs(changePercent)}
          direction={spentLessThanLastMonth ? 'down' : 'up'}
          positive={spentLessThanLastMonth}
        />
      </View>

      <Text style={styles.netLabel}>Net this month</Text>
      <Text style={[styles.netAmount, { color: net >= 0 ? colors.income : colors.expense }]}>
        {formatCurrency(net)}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${spentRatio * 100}%` }]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>{formatCurrency(income)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={[styles.statValue, { color: colors.expense }]}>{formatCurrency(expenses)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  month: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  netLabel: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  netAmount: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.expense,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  statBlock: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
  },
});
