import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Alert } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { springs } from "@/constants/motion";
import { colors } from "@/constants/theme";
import { deleteTransaction } from "@/services/databaseService";
import { useTransactionStore } from "@/store/useTransactionStore";
import { Transaction, TransactionCategory } from "@/types/transaction";
import { formatCurrency, formatShortDate } from "@/utils/format";
import { haptics } from "@/utils/haptics";

type IconName = ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ICON: Record<TransactionCategory, IconName> = {
  "Food & Dining": "fast-food-outline",
  Transport: "car-outline",
  Shopping: "bag-outline",
  "Bills & Utilities": "flash-outline",
  Entertainment: "film-outline",
  Health: "medkit-outline",
  Income: "arrow-down-circle-outline",
  Other: "ellipsis-horizontal-circle-outline",
};

// Wide enough for a comfortable tap target, narrow enough that a small "just checking" swipe
// doesn't already reveal it.
const DELETE_WIDTH = 84;
const DELETE_THRESHOLD = DELETE_WIDTH / 2;
const OPEN_FLING_VELOCITY = -600;
const CLOSE_FLING_VELOCITY = 600;
// Any deliberate drag past this counts as "the user swiped" and commits the row fully open or
// closed — see the comment on `pan.onEnd` below for why this can't require crossing DELETE_THRESHOLD.
const MIN_COMMIT_DRAG = 4;

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const { id, merchant, category, amount, date, isDeductible } = transaction;
  const isIncome = amount > 0;

  const removeTransaction = useTransactionStore((state) => state.removeTransaction);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);

  const closeSwipe = () => {
    translateX.value = withSpring(0, springs.sheet);
  };

  // Optimistic: the row disappears the instant the trash can is tapped (this component unmounts as
  // soon as `transactions` drops it, well before the network call resolves), and re-inserts itself
  // only if the remote delete actually failed.
  const handleDelete = () => {
    haptics.impact();
    removeTransaction(id);
    deleteTransaction(id).catch((error) => {
      console.warn("[TransactionRow] Failed to delete transaction:", error);
      haptics.error();
      addTransaction(transaction);
      Alert.alert("Delete failed", "We couldn't delete this transaction. Check your connection and try again.");
    });
  };

  const handleRowPress = () => {
    // An open swipe eats the first tap as "close" rather than firing onPress — matches the
    // standard iOS/Android swipe-action pattern and avoids an accidental navigation mid-swipe.
    if (translateX.value < -1) {
      closeSwipe();
      return;
    }
    onPress?.();
  };

  // activeOffsetX/failOffsetY hand this off to the ScrollView's own vertical pan until the drag is
  // unambiguously horizontal, so swiping a row doesn't fight the list's scroll. Two-finger trackpad
  // swipes are opt-in on web (RNGH defaults this off), so without it a laptop trackpad "swipe"
  // never moves the row at all.
  const pan = Gesture.Pan()
    .enableTrackpadTwoFingerGesture(true)
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onStart(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(0, Math.max(-DELETE_WIDTH, dragStartX.value + event.translationX));
    })
    .onEnd((event) => {
      // Mouse/trackpad input on web can deliver one continuous-feeling swipe as several short,
      // separate gesture bursts (each with its own onEnd) rather than touch's single fluid drag.
      // Deciding "open" only when the drag crosses DELETE_THRESHOLD meant an in-progress swipe kept
      // snapping back to closed between bursts before the user could reach the trash can. Instead,
      // commit fully open/closed based on which way this burst actually moved, and only fall back
      // to DELETE_THRESHOLD when a burst barely moved at all (preserve whatever state it was already in).
      const netDrag = translateX.value - dragStartX.value;
      let shouldOpen = dragStartX.value <= -DELETE_THRESHOLD;
      if (netDrag < -MIN_COMMIT_DRAG || event.velocityX < OPEN_FLING_VELOCITY) {
        shouldOpen = true;
      } else if (netDrag > MIN_COMMIT_DRAG || event.velocityX > CLOSE_FLING_VELOCITY) {
        shouldOpen = false;
      }
      translateX.value = withSpring(shouldOpen ? -DELETE_WIDTH : 0, springs.sheet);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Box className="relative overflow-hidden">
      <Box className="absolute bottom-0 right-0 top-0 items-center justify-center bg-card" style={{ width: DELETE_WIDTH }}>
        <AnimatedPressable className="h-full w-full items-center justify-center" onPress={handleDelete} hitSlop={8}>
          <Box className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: colors.expenseSoft }}>
            <Ionicons name="trash-outline" size={17} color={colors.expense} />
          </Box>
        </AnimatedPressable>
      </Box>

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>
          <AnimatedPressable className="flex-row items-center bg-card py-3" scaleTo={0.98} onPress={handleRowPress}>
            <Box
              className={`mr-4 h-10 w-10 items-center justify-center rounded-md ${isIncome ? "bg-income/16" : "bg-popover"}`}
            >
              <Ionicons
                name={CATEGORY_ICON[category]}
                size={18}
                color={isIncome ? colors.income : colors.textSecondary}
              />
            </Box>

            <Box className="flex-1">
              <Box className="flex-row items-center">
                <Text
                  className="font-body-semibold text-[15px] text-foreground"
                  isTruncated
                >
                  {merchant}
                </Text>
                {isDeductible && (
                  <Box className="ml-1 h-4 w-4 items-center justify-center rounded-full bg-gold/16">
                    <Ionicons name="document-text" size={9} color={colors.gold} />
                  </Box>
                )}
              </Box>
              <Text className="mt-[3px] font-mono text-[11px] text-muted-foreground">
                {category} · {formatShortDate(date)}
              </Text>
            </Box>

            <Text
              className={`ml-2 font-mono-semibold text-[15px] ${isIncome ? "text-income" : "text-foreground"}`}
            >
              {isIncome ? "+" : ""}
              {formatCurrency(amount)}
            </Text>
          </AnimatedPressable>
        </Animated.View>
      </GestureDetector>
    </Box>
  );
}
