import Slider from '@react-native-community/slider';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';

const PRICE_STEP = 1;

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
  /** Forces the two thumbs to remount (and snap to `value`) — see useTransactionFilters for why. */
  resetKey?: number;
}

/**
 * A min/max amount range built from two overlapping single-thumb sliders — `@react-native-community/slider`
 * has no native dual-thumb mode, but its `lowerLimit`/`upperLimit` props let each slider's drag be
 * clamped by the other's current value, which is enough to fake a real range slider.
 */
export function PriceRangeSlider({ min, max, value, onChange, resetKey = 0 }: PriceRangeSliderProps) {
  const [low, high] = value;

  return (
    <Box className="gap-3">
      <Box className="flex-row items-center justify-between">
        <Text className="font-mono text-[11px] tracking-[1px] text-muted-foreground">AMOUNT RANGE</Text>
        <Text className="font-mono-semibold text-[13px] text-foreground">
          {formatCurrency(low)} – {formatCurrency(high)}
        </Text>
      </Box>

      <Box className="gap-1">
        <Text className="font-body text-[11px] text-muted-foreground">Min</Text>
        <Slider
          key={`min-${resetKey}`}
          value={low}
          minimumValue={min}
          maximumValue={max}
          upperLimit={high}
          step={PRICE_STEP}
          minimumTrackTintColor={colors.borderStrong}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          onValueChange={(next) => onChange([next, high])}
        />
      </Box>

      <Box className="gap-1">
        <Text className="font-body text-[11px] text-muted-foreground">Max</Text>
        <Slider
          key={`max-${resetKey}`}
          value={high}
          minimumValue={min}
          maximumValue={max}
          lowerLimit={low}
          step={PRICE_STEP}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
          onValueChange={(next) => onChange([low, next])}
        />
      </Box>
    </Box>
  );
}
