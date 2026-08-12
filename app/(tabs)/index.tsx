import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSummaryCard } from '@/components/home/MonthSummaryCard';
import { TransactionRow } from '@/components/home/TransactionRow';
import { colors, radii, spacing } from '@/constants/theme';
import { mockMonthlySummary, mockTransactions } from '@/data/mockTransactions';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>Your finances</Text>
        </View>

        <MonthSummaryCard summary={mockMonthlySummary} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>
        </View>

        <View style={styles.transactionList}>
          {mockTransactions.map((transaction, index) => (
            <View key={transaction.id}>
              {index > 0 && <View style={styles.separator} />}
              <TransactionRow transaction={transaction} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 14,
    color: colors.textMuted,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  transactionList: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
});
