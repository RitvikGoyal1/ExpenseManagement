import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { Transaction, TransactionCategory } from '@/types/transaction';
import { formatCurrency, formatShortDate } from '@/utils/format';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<TransactionCategory, IconName> = {
  'Food & Dining': 'fast-food-outline',
  Transport: 'car-outline',
  Shopping: 'bag-outline',
  'Bills & Utilities': 'flash-outline',
  Entertainment: 'film-outline',
  Health: 'medkit-outline',
  Income: 'arrow-down-circle-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const { merchant, category, amount, date } = transaction;
  const isIncome = amount > 0;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: isIncome ? colors.incomeSoft : colors.background }]}>
        <Ionicons
          name={CATEGORY_ICON[category]}
          size={18}
          color={isIncome ? colors.income : colors.textSecondary}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.merchant} numberOfLines={1}>
          {merchant}
        </Text>
        <Text style={styles.meta}>
          {category} · {formatShortDate(date)}
        </Text>
      </View>

      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.textPrimary }]}>
        {isIncome ? '+' : ''}
        {formatCurrency(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  details: {
    flex: 1,
  },
  merchant: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
