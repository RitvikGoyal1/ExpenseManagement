import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { PriceRangeSlider } from '@/components/ui/PriceRangeSlider';
import { SearchBar } from '@/components/ui/SearchBar';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import { haptics } from '@/utils/haptics';
import { UseTransactionFiltersResult } from '@/utils/useTransactionFilters';

interface TransactionFiltersProps {
  filters: UseTransactionFiltersResult;
}

/**
 * Search bar + a collapsible "Amount range / Date range" panel, combined into the single filtered
 * list useTransactionFilters already computes. The panel's height is measured off its own
 * (always-mounted, never conditionally unrendered) content via onLayout, then animated between 0
 * and that measured height — content keeps its natural size while collapsed (RN/Yoga children don't
 * shrink by default), the parent's `overflow: hidden` just clips it, which is what makes the
 * measure-while-clipped trick work without a second hidden copy of the content.
 */
export function TransactionFilters({ filters }: TransactionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = useSharedValue(0);
  const measuredHeight = useSharedValue(0);

  const handleToggle = () => {
    haptics.selection();
    const next = !isExpanded;
    setIsExpanded(next);
    progress.value = withSpring(next ? 1 : 0, springs.default);
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    measuredHeight.value = event.nativeEvent.layout.height;
  };

  const panelStyle = useAnimatedStyle(() => ({
    height: progress.value * measuredHeight.value,
    opacity: progress.value,
  }));

  return (
    <Box className="gap-3">
      <Box className="flex-row items-center gap-2">
        <Box className="flex-1">
          <SearchBar value={filters.query} onChangeText={filters.setQuery} />
        </Box>

        <AnimatedPressable
          className="h-10 w-10 items-center justify-center rounded-md border border-border bg-card"
          onPress={handleToggle}
          scaleTo={0.9}
        >
          <Ionicons
            name={isExpanded ? 'options' : 'options-outline'}
            size={18}
            color={filters.activeFilterCount > 0 || isExpanded ? colors.primary : colors.textSecondary}
          />
          {filters.activeFilterCount > 0 && (
            <Box className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-primary">
              <Text className="font-mono-semibold text-[9px] text-glass">{filters.activeFilterCount}</Text>
            </Box>
          )}
        </AnimatedPressable>
      </Box>

      <Animated.View style={[{ overflow: 'hidden' }, panelStyle]}>
        <Box className="gap-5 rounded-lg border border-border bg-card p-4" onLayout={handleContentLayout} pointerEvents={isExpanded ? 'auto' : 'none'}>
          <PriceRangeSlider
            min={0}
            max={filters.priceCeiling}
            value={filters.priceRange}
            onChange={filters.setPriceRange}
            resetKey={filters.priceResetKey}
          />

          <Box className="h-px bg-border" />

          <DateRangeFilter value={filters.dateRange} onChange={filters.setDateRange} />

          {filters.activeFilterCount > 0 && (
            <AnimatedPressable
              className="flex-row items-center justify-center gap-1.5 rounded-md border border-border py-2.5"
              onPress={filters.resetFilters}
            >
              <Ionicons name="close-circle-outline" size={14} color={colors.textSecondary} />
              <Text className="font-body-semibold text-xs text-muted-foreground">Clear Filters</Text>
            </AnimatedPressable>
          )}
        </Box>
      </Animated.View>
    </Box>
  );
}
