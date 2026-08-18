import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input, InputField } from '@/components/ui/input';
import { KeyboardAvoidingView } from '@/components/ui/keyboard-avoiding-view';
import { Pressable } from '@/components/ui/pressable';
import { ReceiptImageViewer } from '@/components/ui/ReceiptImageViewer';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { deleteTransaction } from '@/services/databaseService';
import { useTransactionStore } from '@/store/useTransactionStore';
import { DEDUCTION_CATEGORIES, DeductionCategory, TRANSACTION_CATEGORIES, TransactionCategory } from '@/types/transaction';
import { formatCurrency } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const transaction = useTransactionStore((state) => state.transactions.find((t) => t.id === id));
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const removeTransaction = useTransactionStore((state) => state.removeTransaction);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const [merchant, setMerchant] = useState(transaction?.merchant ?? '');
  const [amountText, setAmountText] = useState(transaction ? String(transaction.amount) : '');
  const [category, setCategory] = useState<TransactionCategory>(transaction?.category ?? 'Other');
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString());
  const [isDeductible, setIsDeductible] = useState(transaction?.isDeductible ?? false);
  const [deductionCategory, setDeductionCategory] = useState<DeductionCategory | undefined>(
    transaction?.deductionCategory,
  );
  const [isReceiptViewerVisible, setIsReceiptViewerVisible] = useState(false);

  const parsedAmount = useMemo(() => {
    const value = Number(amountText);
    return Number.isFinite(value) ? value : 0;
  }, [amountText]);

  const isIncome = parsedAmount > 0;

  const handleToggleDeductible = (value: boolean) => {
    haptics.impact();
    setIsDeductible(value);
    if (value && !deductionCategory) {
      setDeductionCategory('Business Expense');
    }
  };

  const handleSave = () => {
    if (!transaction) {
      return;
    }
    updateTransaction(transaction.id, {
      merchant: merchant.trim() || transaction.merchant,
      amount: parsedAmount,
      category,
      date,
      isDeductible,
      deductionCategory: isDeductible ? deductionCategory : undefined,
    });
    haptics.success();
    router.back();
  };

  // Optimistic, same as TransactionRow's swipe-to-delete: navigate back immediately and only
  // restore + surface an alert if the remote delete actually fails.
  const handleDelete = () => {
    if (!transaction) {
      return;
    }
    haptics.impact();
    removeTransaction(transaction.id);
    router.back();
    deleteTransaction(transaction.id).catch((error) => {
      console.warn('[TransactionDetailScreen] Failed to delete transaction:', error);
      haptics.error();
      addTransaction(transaction);
      Alert.alert("Delete failed", "We couldn't delete this transaction. Check your connection and try again.");
    });
  };

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header onBack={() => router.back()} title="Transaction Details" />
        <Box className="flex-1 items-center justify-center gap-2">
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text className="font-body-medium text-sm text-muted-foreground">This transaction couldn&apos;t be found.</Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header onBack={() => router.back()} onDelete={handleDelete} title="Transaction Details" />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={12}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Box className="items-center rounded-lg border border-border bg-card py-4">
            <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">AMOUNT</Text>
            <Box className="flex-row items-center">
              <Text className={`mr-0.5 font-display-bold text-[34px] ${isIncome ? 'text-income' : 'text-foreground'}`}>$</Text>
              <Input className="min-h-0 w-auto border-0 bg-transparent px-0 shadow-none">
                <InputField
                  className={`w-[200px] flex-none p-0 text-center font-display-bold ${isIncome ? 'text-income' : 'text-foreground'}`}
                  style={{ fontSize: 40, letterSpacing: -1 }}
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="numbers-and-punctuation"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />
              </Input>
            </Box>
            <Text className="mt-2 font-body text-[11px] text-muted-foreground">Use a negative value for expenses, positive for income.</Text>
          </Box>

          <Box className="mt-8">
            <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">RECEIPT</Text>
            {transaction.imagePath ? (
              <AnimatedPressable
                className="flex-row items-center rounded-lg border border-border bg-card p-4"
                onPress={() => setIsReceiptViewerVisible(true)}
              >
                <Box className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary/16">
                  <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                </Box>
                <Box className="flex-1">
                  <Text className="font-body-semibold text-[15px] text-foreground">View Original Receipt</Text>
                  <Text className="mt-0.5 font-body text-xs text-muted-foreground">Open the scanned image</Text>
                </Box>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </AnimatedPressable>
            ) : (
              <Box className="flex-row items-center rounded-lg border border-border bg-card p-4">
                <Box className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </Box>
                <Box className="flex-1">
                  <Text className="font-body-semibold text-[15px] text-foreground">Entered Manually</Text>
                  <Text className="mt-0.5 font-body text-xs text-muted-foreground">No receipt image — this transaction was added by hand.</Text>
                </Box>
              </Box>
            )}
          </Box>

          <Box className="mt-8">
            <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">VENDOR</Text>
            <Input className="rounded-md border border-border bg-card px-4 py-3.5">
              <InputField
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Merchant name"
                placeholderTextColor={colors.textMuted}
              />
            </Input>
          </Box>

          <Box className="mt-8">
            <DatePickerField label="DATE" value={date} onChange={setDate} />
          </Box>

          <Box className="mt-8">
            <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">CATEGORY</Text>
            <Box className="flex-row flex-wrap gap-2">
              {TRANSACTION_CATEGORIES.map((option) => (
                <Chip key={option} label={option} selected={option === category} onPress={() => setCategory(option)} />
              ))}
            </Box>
          </Box>

          {transaction.lineItems && transaction.lineItems.length > 0 && (
            <Box className="mt-8">
              <Text className="mb-2 font-mono text-[11px] tracking-[1px] text-muted-foreground">ITEMS</Text>
              <Box className="rounded-lg border border-border bg-card px-4">
                {transaction.lineItems.map((item, index) => (
                  <Box key={`${item.description}-${index}`}>
                    {index > 0 && <Box className="h-px bg-border" />}
                    <Box className="flex-row items-center justify-between py-3">
                      <Text className="mr-2 flex-1 font-body-medium text-[14px] text-foreground" isTruncated>
                        {item.description}
                      </Text>
                      <Text className="font-mono-semibold text-[13px] text-foreground">{formatCurrency(item.price)}</Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box className="mt-8 gap-4 rounded-lg border border-border bg-card p-4">
            <Box className="flex-row items-center">
              <Box className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-gold/16">
                <Ionicons name="document-text-outline" size={18} color={colors.gold} />
              </Box>
              <Box className="mr-2 flex-1">
                <Text className="font-body-semibold text-[15px] text-foreground">Tax Deductible</Text>
                <Text className="mt-0.5 font-body text-xs text-muted-foreground">Mark this as a business expense for your accountant.</Text>
              </Box>
              <Switch
                value={isDeductible}
                onValueChange={handleToggleDeductible}
                trackColor={{ false: colors.border, true: colors.goldSoft }}
                thumbColor={isDeductible ? colors.gold : colors.textMuted}
                ios_backgroundColor={colors.border}
              />
            </Box>

            {isDeductible && (
              <Box className="flex-row flex-wrap gap-2">
                {DEDUCTION_CATEGORIES.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={option === deductionCategory}
                    onPress={() => setDeductionCategory(option)}
                    tint="gold"
                  />
                ))}
              </Box>
            )}
          </Box>
        </ScrollView>

        <Box className="px-6 pb-4 pt-2">
          <AnimatedPressable
            className="items-center rounded-lg bg-primary py-4"
            style={{ shadowColor: colors.primary, shadowRadius: 12, shadowOpacity: 0.22, shadowOffset: { width: 0, height: 4 } }}
            onPress={handleSave}
          >
            <Text className="font-body-bold text-base text-glass">Save Changes</Text>
          </AnimatedPressable>
        </Box>
      </KeyboardAvoidingView>

      {transaction.imagePath && (
        <ReceiptImageViewer
          visible={isReceiptViewerVisible}
          imagePath={transaction.imagePath}
          onClose={() => setIsReceiptViewerVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

interface HeaderProps {
  onBack: () => void;
  onDelete?: () => void;
  title: string;
}

function Header({ onBack, onDelete, title }: HeaderProps) {
  return (
    <Box className="flex-row items-center justify-between px-4 pb-2">
      <AnimatedPressable className="h-9 w-9 items-center justify-center rounded-full" onPress={onBack} scaleTo={0.85} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </AnimatedPressable>
      <Text className="font-body-semibold text-[15px] text-foreground">{title}</Text>
      {onDelete ? (
        <AnimatedPressable className="h-9 w-9 items-center justify-center rounded-full" onPress={onDelete} scaleTo={0.85} hitSlop={8}>
          <Ionicons name="trash-outline" size={19} color={colors.expense} />
        </AnimatedPressable>
      ) : (
        <Box className="h-9 w-9" />
      )}
    </Box>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  tint?: 'primary' | 'gold';
}

function Chip({ label, selected, onPress, tint = 'primary' }: ChipProps) {
  const activeColor = tint === 'gold' ? colors.gold : colors.primary;
  const selectedClass = tint === 'gold' ? 'border-gold bg-gold/16' : 'border-primary bg-primary/16';

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className={`rounded-full border px-4 py-2 ${selected ? selectedClass : 'border-border bg-card'}`}
    >
      <Text className="font-body-medium text-[13px]" style={{ color: selected ? activeColor : colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}
