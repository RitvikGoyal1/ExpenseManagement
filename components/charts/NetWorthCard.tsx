import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';
import { Box } from '@/components/ui/box';
import { DoubleRule } from '@/components/ui/DoubleRule';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { cardShadow, colors } from '@/constants/theme';
import { BalanceSheet } from '@/types/analytics';
import { formatCurrency } from '@/utils/format';

interface NetWorthCardProps {
  balanceSheet: BalanceSheet;
}

export function NetWorthCard({ balanceSheet }: NetWorthCardProps) {
  const { assets, liabilities, totalAssets, totalLiabilities } = balanceSheet;
  const netWorth = totalAssets - totalLiabilities;
  const combined = totalAssets + totalLiabilities;
  const assetsRatio = combined > 0 ? totalAssets / combined : 0;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(250, withSpring(1, springs.default));
  }, [progress]);

  // Only the assets segment needs to animate — its sibling's flex is fixed
  // at its final ratio, so as assets grows from 0 flexbox naturally
  // redistributes the row's width between the two proportionally each frame.
  const assetsSegmentStyle = useAnimatedStyle(() => ({
    flex: progress.value * assetsRatio,
  }));

  return (
    <Box className="rounded-lg border border-border bg-card p-6" style={cardShadow}>
      <Text className="font-display-semibold text-[17px] text-foreground">Net worth snapshot</Text>
      <Text className="mt-4 font-body text-[13px] text-muted-foreground">Total net worth</Text>
      <AnimatedCurrency
        value={netWorth}
        delay={100}
        className="mt-0.5 font-display-bold text-[34px] tracking-[-0.7px] text-foreground"
      />
      <DoubleRule />

      <Box className="mt-6 h-2.5 flex-row overflow-hidden rounded-full">
        <Animated.View style={[{ height: '100%', backgroundColor: colors.income }, assetsSegmentStyle]} />
        <Box className="h-full bg-destructive" style={{ flex: 1 - assetsRatio }} />
      </Box>

      <Box className="mt-4 flex-row">
        <Box className="flex-1">
          <Box className="flex-row items-center gap-1.5">
            <Box className="h-2 w-2 rounded-full bg-income" />
            <Text className="font-mono text-[10px] tracking-[0.6px] text-muted-foreground">ASSETS</Text>
          </Box>
          <Text className="mt-[3px] font-mono-semibold text-base text-income">{formatCurrency(totalAssets)}</Text>
        </Box>
        <Box className="mx-4 w-px bg-border" />
        <Box className="flex-1">
          <Box className="flex-row items-center gap-1.5">
            <Box className="h-2 w-2 rounded-full bg-destructive" />
            <Text className="font-mono text-[10px] tracking-[0.6px] text-muted-foreground">LIABILITIES</Text>
          </Box>
          <Text className="mt-[3px] font-mono-semibold text-base text-destructive">{formatCurrency(totalLiabilities)}</Text>
        </Box>
      </Box>

      <Box className="mt-6 flex-row border-t border-border pt-4">
        <Box className="flex-1 gap-2">
          {assets.map((item) => (
            <Box key={item.id} className="flex-row justify-between">
              <Text className="shrink font-body text-[13px] text-secondary-foreground" numberOfLines={1}>
                {item.label}
              </Text>
              <Text className="font-mono-medium text-[13px] text-foreground">{formatCurrency(item.amount)}</Text>
            </Box>
          ))}
        </Box>
        <Box className="mx-4 w-px bg-border" />
        <Box className="flex-1 gap-2">
          {liabilities.map((item) => (
            <Box key={item.id} className="flex-row justify-between">
              <Text className="shrink font-body text-[13px] text-secondary-foreground" numberOfLines={1}>
                {item.label}
              </Text>
              <Text className="font-mono-medium text-[13px] text-foreground">{formatCurrency(item.amount)}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
