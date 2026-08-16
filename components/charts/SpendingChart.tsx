import { useCallback, useState } from 'react';
import { PieChart } from 'react-native-gifted-charts';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { Text } from '@/components/ui/text';
import { cardShadow, colors } from '@/constants/theme';
import { SpendingCategory } from '@/types/analytics';
import { formatCurrency } from '@/utils/format';
import { haptics } from '@/utils/haptics';

interface SpendingChartProps {
  categories: SpendingCategory[];
}

export function SpendingChart({ categories }: SpendingChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const total = categories.reduce((sum, category) => sum + category.amount, 0);
  const selected = selectedIndex !== null ? categories[selectedIndex] : null;

  const handleSelect = useCallback((index: number) => {
    haptics.selection();
    setSelectedIndex((current) => (current === index ? null : index));
  }, []);

  const pieData = categories.map((category) => ({
    value: category.amount,
    color: category.color,
  }));

  return (
    <Box className="rounded-lg border border-border bg-card p-6" style={cardShadow}>
      <Text className="font-display-semibold text-[17px] text-foreground">Spending breakdown</Text>
      <Text className="mt-0.5 font-body text-[13px] text-muted-foreground">Tap a slice, or a category below, to inspect it</Text>

      <Box className="mb-4 mt-6 items-center">
        <PieChart
          data={pieData}
          donut
          radius={92}
          innerRadius={62}
          innerCircleColor={colors.surface}
          isAnimated
          animationDuration={700}
          focusOnPress
          toggleFocusOnPress
          extraRadius={12}
          strokeWidth={3}
          strokeColor={colors.surface}
          onPress={(_: unknown, index: number) => handleSelect(index)}
          centerLabelComponent={() => (
            <Box className="w-[100px] items-center justify-center">
              {selected ? (
                <>
                  <Text className="font-mono-semibold text-[15px] text-foreground">{formatCurrency(selected.amount)}</Text>
                  <Text className="mt-0.5 font-mono text-[9px] tracking-[0.6px]" style={{ color: selected.color }} numberOfLines={1}>
                    {selected.label.toUpperCase()}
                  </Text>
                </>
              ) : (
                <>
                  <Text className="font-mono-semibold text-[15px] text-foreground">{formatCurrency(total)}</Text>
                  <Text className="mt-0.5 font-mono text-[9px] tracking-[0.6px] text-muted-foreground">TOTAL SPENT</Text>
                </>
              )}
            </Box>
          )}
        />
      </Box>

      <Box className="mt-2 gap-2">
        {categories.map((category, index) => {
          const percent = total > 0 ? (category.amount / total) * 100 : 0;
          const isSelected = selectedIndex === index;
          return (
            <FadeSlideIn key={category.id} delay={index * 45}>
              <AnimatedPressable
                className="flex-row items-center rounded-md border px-1 py-1"
                style={{ borderColor: isSelected ? category.color : 'transparent' }}
                onPress={() => handleSelect(index)}
                scaleTo={0.98}
              >
                <Box className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                <Text
                  className={`flex-1 text-sm text-foreground ${isSelected ? 'font-body-semibold' : 'font-body-medium'}`}
                  numberOfLines={1}
                >
                  {category.label}
                </Text>
                <Text className="w-9 text-right font-mono text-xs text-muted-foreground">{percent.toFixed(0)}%</Text>
                <Text className="w-[76px] text-right font-mono-semibold text-[13px] text-foreground">
                  {formatCurrency(category.amount)}
                </Text>
              </AnimatedPressable>
            </FadeSlideIn>
          );
        })}
      </Box>
    </Box>
  );
}
