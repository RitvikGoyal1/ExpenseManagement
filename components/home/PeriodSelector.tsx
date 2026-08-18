import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { SummaryPeriod } from '@/types/transaction';
import { haptics } from '@/utils/haptics';

const OPTIONS: { value: SummaryPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' },
];

interface PeriodSelectorProps {
  value: SummaryPeriod;
  onChange: (period: SummaryPeriod) => void;
}

/** Same pill-preset visual language as DateRangeFilter, laid out as four fixed-width tabs instead of a wrapping row. */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Box className="flex-row gap-1.5">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (option.value === value) {
                return;
              }
              haptics.selection();
              onChange(option.value);
            }}
            className={`flex-1 items-center justify-center rounded-md border py-1.5 ${
              selected ? 'border-primary bg-primary/16' : 'border-border bg-transparent'
            }`}
          >
            <Text
              className="font-body-medium text-[11px]"
              numberOfLines={1}
              style={{ color: selected ? colors.primary : colors.textSecondary }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}
