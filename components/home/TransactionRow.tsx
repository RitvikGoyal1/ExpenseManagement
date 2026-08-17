import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { Transaction, TransactionCategory } from "@/types/transaction";
import { formatCurrency, formatShortDate } from "@/utils/format";

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

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const { merchant, category, amount, date, isDeductible } = transaction;
  const isIncome = amount > 0;

  return (
    <AnimatedPressable
      className="flex-row items-center py-3"
      scaleTo={0.98}
      onPress={onPress}
    >
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
  );
}
