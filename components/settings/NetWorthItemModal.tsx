import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import { insertNetWorthItem } from '@/services/databaseService';
import { NetWorthItem, NetWorthItemType } from '@/types/analytics';
import { haptics } from '@/utils/haptics';
import { useKeyboardHeight } from '@/utils/useKeyboardHeight';

// Far enough below the screen to guarantee full concealment on any device.
const HIDDEN_OFFSET = 420;

interface NetWorthItemModalProps {
  visible: boolean;
  type: NetWorthItemType;
  onCancel: () => void;
  onConfirm: (item: NetWorthItem) => void;
}

/**
 * A lightweight version of ManualTransactionModal's sheet (same blur/spring chrome, no
 * pan-to-dismiss gesture — one label + one amount field doesn't need it) for adding a single
 * asset or liability line from Settings' Net Worth section. `type` is fixed by the caller (which
 * "Add" row was tapped), not a toggle inside the sheet.
 */
export function NetWorthItemModal({ visible, type, onCancel, onConfirm }: NetWorthItemModalProps) {
  const translateY = useSharedValue(HIDDEN_OFFSET);
  const keyboardHeight = useKeyboardHeight();

  const [label, setLabel] = useState('');
  const [amountText, setAmountText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setLabel('');
    setAmountText('');
    setIsSaving(false);

    translateY.value = HIDDEN_OFFSET;
    translateY.value = withSpring(0, springs.sheet);
  }, [visible, translateY]);

  const animateClosed = (onFinished?: () => void) => {
    translateY.value = withSpring(HIDDEN_OFFSET, springs.sheet, (finished) => {
      if (finished) {
        runOnJS(onFinished ?? onCancel)();
      }
    });
  };

  // A cloud save is in flight — none of the dismiss paths (backdrop tap, X button, hardware back)
  // should be able to close the sheet out from under it.
  const handleRequestDismiss = () => {
    if (isSaving) {
      return;
    }
    animateClosed();
  };

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }

    const trimmedLabel = label.trim();
    const parsedAmount = Number(amountText);
    const magnitude = Number.isFinite(parsedAmount) ? Math.abs(parsedAmount) : 0;

    if (!trimmedLabel || magnitude <= 0) {
      Alert.alert('Missing details', 'Enter a label and an amount greater than $0.');
      return;
    }

    setIsSaving(true);
    try {
      const id = await insertNetWorthItem({ label: trimmedLabel, amount: magnitude, type });
      haptics.success();
      animateClosed(() => onConfirm({ id, label: trimmedLabel, amount: magnitude, type }));
    } catch (error) {
      console.warn('[NetWorthItemModal] Cloud save failed:', error);
      haptics.error();
      setIsSaving(false);
      Alert.alert('Save failed', "We couldn't save this item. Check your connection and try again.");
    }
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, 1 - translateY.value / HIDDEN_OFFSET)) * 0.6,
  }));

  const keyboardSpacingStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));

  const isAsset = type === 'asset';
  const tintColor = isAsset ? colors.income : colors.expense;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleRequestDismiss}>
      <Box className="flex-1 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleRequestDismiss} disabled={isSaving}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#020203' }, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[
            {
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
            <Box className="px-6 pb-8 pt-3">
              <Box className="mb-4 h-1 w-10 self-center rounded-full bg-foreground/20" />

              <Box className="mb-5 flex-row items-center">
                <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${tintColor}29` }}>
                  <Ionicons name={isAsset ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={tintColor} />
                </Box>
                <Box className="flex-1">
                  <Text className="font-display-semibold text-base text-foreground">{isAsset ? 'Add Asset' : 'Add Liability'}</Text>
                  <Text className="font-body text-xs text-muted-foreground">
                    {isAsset ? 'Cash, investments, property, ...' : 'Loans, credit cards, mortgage, ...'}
                  </Text>
                </Box>
                <AnimatedPressable onPress={handleRequestDismiss} disabled={isSaving} hitSlop={8} scaleTo={0.85}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </AnimatedPressable>
              </Box>

              <Text className="mb-1.5 font-mono text-[11px] tracking-[1px] text-muted-foreground">LABEL</Text>
              <Input className="rounded-md border border-border bg-card px-4 py-3">
                <InputField
                  value={label}
                  onChangeText={setLabel}
                  placeholder={isAsset ? 'e.g. Checking account' : 'e.g. Credit card'}
                  placeholderTextColor={colors.textMuted}
                />
              </Input>

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

              <Box className="mt-6 flex-row gap-3">
                <AnimatedPressable
                  className="flex-1 items-center rounded-lg border border-border bg-card py-3.5"
                  onPress={handleRequestDismiss}
                  disabled={isSaving}
                >
                  <Text className="font-body-semibold text-[15px] text-foreground">Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  className={`flex-[1.4] flex-row items-center justify-center gap-2 rounded-lg py-3.5 ${isSaving ? 'opacity-70' : ''}`}
                  style={{
                    backgroundColor: tintColor,
                    shadowColor: tintColor,
                    shadowRadius: 12,
                    shadowOpacity: 0.22,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                  onPress={handleConfirm}
                  disabled={isSaving}
                >
                  {isSaving && <ActivityIndicator size="small" color={colors.glass} />}
                  <Text className="font-body-bold text-[15px] text-glass">{isSaving ? 'Saving…' : 'Save'}</Text>
                </AnimatedPressable>
              </Box>
            </Box>
          </Animated.View>
        </Animated.View>
      </Box>
    </Modal>
  );
}
