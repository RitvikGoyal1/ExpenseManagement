import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Input, InputField } from '@/components/ui/input';
import { Pressable as GluePressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import {
  DEDUCTION_CATEGORIES,
  DeductionCategory,
  TRANSACTION_CATEGORIES,
  Transaction,
  TransactionCategory,
} from '@/types/transaction';
import { haptics } from '@/utils/haptics';
import { useKeyboardHeight } from '@/utils/useKeyboardHeight';

// Far enough below the screen to guarantee full concealment on any device.
const HIDDEN_OFFSET = 820;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 800;
const RUBBER_BAND_DIMENSION = 60;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type TransactionType = 'expense' | 'income';

// "Income" is its own category (forced below), not a pickable expense bucket.
const EXPENSE_CATEGORIES = TRANSACTION_CATEGORIES.filter((option) => option !== 'Income');

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

interface ManualTransactionModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (transaction: Transaction) => void;
}

/**
 * A hand-built spring/gesture bottom sheet (same construction as
 * ReceiptConfirmationModal / AiInsightSheet) for entering a transaction with
 * no photo involved — the "I paid cash" / "I got paid" path. Unlike the
 * receipt flow, which is always an expense, this one opens with an
 * expense/income switch since either direction is a normal manual entry.
 */
export function ManualTransactionModal({ visible, onCancel, onConfirm }: ManualTransactionModalProps) {
  const translateY = useSharedValue(HIDDEN_OFFSET);
  const hasCrossedThreshold = useSharedValue(false);
  // Not KeyboardAvoidingView — this sheet lives inside a Modal with a transform-driven position,
  // and KeyboardAvoidingView's frame measurement doesn't account for that reliably (confirmed
  // broken on iOS). Sliding the sheet itself up by the live keyboard height sidesteps the
  // measurement entirely.
  const keyboardHeight = useKeyboardHeight();

  const [type, setType] = useState<TransactionType>('expense');
  const [merchant, setMerchant] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString());
  const [category, setCategory] = useState<TransactionCategory>('Other');
  const [isDeductible, setIsDeductible] = useState(false);
  const [deductionCategory, setDeductionCategory] = useState<DeductionCategory | undefined>(undefined);

  useEffect(() => {
    if (!visible) {
      return;
    }
    // Every field opens blank — this is manual entry, there's no OCR guess to seed from.
    setType('expense');
    setMerchant('');
    setAmountText('');
    setDate(new Date().toISOString());
    setCategory('Other');
    setIsDeductible(false);
    setDeductionCategory(undefined);

    translateY.value = HIDDEN_OFFSET;
    translateY.value = withSpring(0, springs.sheet);
    hasCrossedThreshold.value = false;
  }, [visible, translateY, hasCrossedThreshold]);

  const notifyThresholdCrossed = useCallback(() => {
    haptics.impact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const animateClosed = useCallback(
    (velocity = 0, onFinished?: () => void) => {
      translateY.value = withSpring(HIDDEN_OFFSET, { ...springs.sheet, velocity }, (finished) => {
        if (finished) {
          runOnJS(onFinished ?? onCancel)();
        }
      });
    },
    [onCancel, translateY],
  );

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = rubberband(event.translationY, RUBBER_BAND_DIMENSION);
      } else {
        translateY.value = event.translationY;
      }

      const crossed = event.translationY > DISMISS_DISTANCE;
      if (crossed !== hasCrossedThreshold.value) {
        hasCrossedThreshold.value = crossed;
        if (crossed) {
          runOnJS(notifyThresholdCrossed)();
        }
      }
    })
    .onEnd((event) => {
      const shouldDismiss = event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        animateClosed(event.velocityY);
      } else {
        translateY.value = withSpring(0, { ...springs.sheet, velocity: event.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, 1 - translateY.value / HIDDEN_OFFSET)) * 0.6,
  }));

  // Kept independent of `sheetStyle` on purpose: this only ever reserves room at the bottom of
  // the sheet's own content for the keyboard, so it can't affect whether the sheet itself opens.
  const keyboardSpacingStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));

  const formattedDate = useMemo(
    () => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    [date],
  );

  const handleStepDate = (direction: 1 | -1) => {
    haptics.selection();
    setDate(new Date(new Date(date).getTime() + direction * ONE_DAY_MS).toISOString());
  };

  const handleSelectType = (next: TransactionType) => {
    if (next === type) {
      return;
    }
    haptics.selection();
    setType(next);
    if (next === 'income') {
      setCategory('Income');
      setIsDeductible(false);
      setDeductionCategory(undefined);
    } else {
      setCategory('Other');
    }
  };

  const handleToggleDeductible = (value: boolean) => {
    haptics.impact();
    setIsDeductible(value);
    if (value && !deductionCategory) {
      setDeductionCategory('Business Expense');
    }
  };

  const handleConfirm = () => {
    const parsedAmount = Number(amountText);
    const magnitude = Number.isFinite(parsedAmount) ? Math.abs(parsedAmount) : 0;
    const isIncome = type === 'income';

    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      merchant: merchant.trim() || (isIncome ? 'Unknown Source' : 'Unknown Merchant'),
      category,
      amount: isIncome ? magnitude : -magnitude,
      date,
      isDeductible: !isIncome && isDeductible,
      deductionCategory: !isIncome && isDeductible ? deductionCategory : undefined,
    };

    haptics.success();
    animateClosed(0, () => onConfirm(transaction));
  };

  const isIncome = type === 'income';
  const tintColor = isIncome ? colors.income : colors.expense;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => animateClosed()}>
      {/* Modal content lives in a separate native hierarchy — gesture-handler
          needs its own root here, the app-level one doesn't reach inside. */}
      <GestureHandlerRootView style={styles.fill}>
        <Box className="flex-1 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => animateClosed()}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#020203' }, backdropStyle]} />
          </Pressable>

          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                {
                  maxHeight: '88%',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.borderStrong,
                  borderBottomWidth: 0,
                  overflow: 'hidden',
                },
                sheetStyle,
              ]}
            >
              <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
              <Box className="bg-white/[0.6]" style={StyleSheet.absoluteFill} />

              <Animated.View style={keyboardSpacingStyle}>
                <Box className="px-6 pb-4 pt-3">
                  <Box className="mb-4 h-1 w-10 self-center rounded-full bg-foreground/20" />

                  <Box className="mb-2 flex-row items-center">
                    <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-primary/16">
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                    </Box>
                    <Box className="flex-1">
                      <Text className="font-display-semibold text-base text-foreground">Add Transaction</Text>
                      <Text className="font-body text-xs text-muted-foreground">Enter the details by hand</Text>
                    </Box>
                    <AnimatedPressable onPress={() => animateClosed()} hitSlop={8} scaleTo={0.85}>
                      <Ionicons name="close" size={22} color={colors.textMuted} />
                    </AnimatedPressable>
                  </Box>
                </Box>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                  <Box className="flex-row gap-2 rounded-lg bg-muted p-1">
                    <TypeSegment
                      label="Expense"
                      icon="arrow-down-circle"
                      selected={type === 'expense'}
                      color={colors.expense}
                      onPress={() => handleSelectType('expense')}
                    />
                    <TypeSegment
                      label="Income"
                      icon="arrow-up-circle"
                      selected={type === 'income'}
                      color={colors.income}
                      onPress={() => handleSelectType('income')}
                    />
                  </Box>

                  <Box className="mt-4">
                    <Text className="mb-1.5 font-mono text-[11px] tracking-[1px] text-muted-foreground">
                      {isIncome ? 'SOURCE' : 'MERCHANT'}
                    </Text>
                    <Input className="rounded-md border border-border bg-card px-4 py-3">
                      <InputField
                        value={merchant}
                        onChangeText={setMerchant}
                        placeholder={isIncome ? 'e.g. Paycheck, Client payment' : 'Merchant name'}
                        placeholderTextColor={colors.textMuted}
                      />
                    </Input>
                  </Box>

                  <Box className="mt-4">
                    <Text className="mb-1.5 font-mono text-[11px] tracking-[1px] text-muted-foreground">AMOUNT</Text>
                    <Input className="flex-row items-center rounded-md border border-border bg-card px-4 py-3">
                      <Text className="mr-1 font-body-semibold text-[15px]" style={{ color: tintColor }}>
                        $
                      </Text>
                      <InputField
                        className="p-0"
                        style={{ color: tintColor }}
                        value={amountText}
                        onChangeText={setAmountText}
                        keyboardType="numbers-and-punctuation"
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                      />
                    </Input>
                  </Box>

                  <Box className="mt-4">
                    <Text className="mb-1.5 font-mono text-[11px] tracking-[1px] text-muted-foreground">DATE</Text>
                    <Box className="flex-row items-center justify-between rounded-md border border-border bg-card px-2 py-1">
                      <AnimatedPressable
                        className="h-8 w-8 items-center justify-center rounded-full"
                        onPress={() => handleStepDate(-1)}
                        scaleTo={0.85}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                      </AnimatedPressable>
                      <Text className="font-body-semibold text-[14px] text-foreground">{formattedDate}</Text>
                      <AnimatedPressable
                        className="h-8 w-8 items-center justify-center rounded-full"
                        onPress={() => handleStepDate(1)}
                        scaleTo={0.85}
                        hitSlop={8}
                      >
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </AnimatedPressable>
                    </Box>
                  </Box>

                  {!isIncome && (
                    <Box className="mt-4">
                      <Text className="mb-1.5 font-mono text-[11px] tracking-[1px] text-muted-foreground">CATEGORY</Text>
                      <Box className="flex-row flex-wrap gap-2">
                        {EXPENSE_CATEGORIES.map((option) => (
                          <Chip key={option} label={option} selected={option === category} onPress={() => setCategory(option)} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {!isIncome && (
                    <Box className="mt-4 gap-3 rounded-lg border border-border bg-card p-3.5">
                      <Box className="flex-row items-center">
                        <Box className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-gold/16">
                          <Ionicons name="document-text-outline" size={18} color={colors.gold} />
                        </Box>
                        <Box className="mr-2 flex-1">
                          <Text className="font-body-semibold text-[14px] text-foreground">Tax Deductible</Text>
                          <Text className="mt-0.5 font-body text-[11px] text-muted-foreground">Flag as a business expense</Text>
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
                  )}
                </ScrollView>

                <Box className="flex-row gap-3 px-6 pb-8 pt-4">
                  <AnimatedPressable
                    className="flex-1 items-center rounded-lg border border-border bg-card py-3.5"
                    onPress={() => animateClosed()}
                  >
                    <Text className="font-body-semibold text-[15px] text-foreground">Cancel</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    className="flex-[1.4] items-center rounded-lg py-3.5"
                    style={{
                      backgroundColor: tintColor,
                      shadowColor: tintColor,
                      shadowRadius: 12,
                      shadowOpacity: 0.22,
                      shadowOffset: { width: 0, height: 4 },
                    }}
                    onPress={handleConfirm}
                  >
                    <Text className="font-body-bold text-[15px] text-glass">{isIncome ? 'Add Income' : 'Add Expense'}</Text>
                  </AnimatedPressable>
                </Box>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        </Box>
      </GestureHandlerRootView>
    </Modal>
  );
}

interface TypeSegmentProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  color: string;
  onPress: () => void;
}

function TypeSegment({ label, icon, selected, color, onPress }: TypeSegmentProps) {
  return (
    <GluePressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-md py-2.5 ${selected ? 'bg-card' : ''}`}
    >
      <Ionicons name={icon} size={16} color={selected ? color : colors.textMuted} />
      <Text className="font-body-semibold text-[14px]" style={{ color: selected ? color : colors.textMuted }}>
        {label}
      </Text>
    </GluePressable>
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
    <GluePressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      className={`rounded-full border px-3.5 py-1.5 ${selected ? selectedClass : 'border-border bg-card'}`}
    >
      <Text className="font-body-medium text-xs" style={{ color: selected ? activeColor : colors.textSecondary }}>
        {label}
      </Text>
    </GluePressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
