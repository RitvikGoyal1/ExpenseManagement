import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

interface TrendBadgeProps {
  percent: number;
  direction: 'up' | 'down';
  /** Whether this direction is a good outcome (e.g. spending trending down). */
  positive: boolean;
}

export function TrendBadge({ percent, direction, positive }: TrendBadgeProps) {
  const tint = positive ? colors.income : colors.expense;
  const softTint = positive ? colors.incomeSoft : colors.expenseSoft;
  const icon = direction === 'up' ? 'arrow-up' : 'arrow-down';

  return (
    <View style={[styles.badge, { backgroundColor: softTint }]}>
      <Ionicons name={icon} size={12} color={tint} />
      <Text style={[styles.label, { color: tint }]}>{percent.toFixed(1)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
