import { Box } from '@/components/ui/box';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { haptics } from '@/utils/haptics';
import { DatePreset, DateRangeValue } from '@/utils/useTransactionFilters';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === value.preset) {
      return;
    }
    haptics.selection();
    if (preset === 'custom') {
      // Seed a sensible default window the first time "Custom" is opened rather than starting blank.
      const end = value.end ?? new Date().toISOString();
      const start = value.start ?? new Date(Date.now() - 29 * ONE_DAY_MS).toISOString();
      onChange({ preset, start, end });
      return;
    }
    onChange({ preset, start: null, end: null });
  };

  return (
    <Box className="gap-3">
      <Text className="font-mono text-[11px] tracking-[1px] text-muted-foreground">DATE RANGE</Text>

      <Box className="flex-row flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const selected = value.preset === preset.value;
          return (
            <Pressable
              key={preset.value}
              onPress={() => handleSelectPreset(preset.value)}
              className={`rounded-full border px-3.5 py-1.5 ${selected ? 'border-primary bg-primary/16' : 'border-border bg-card'}`}
            >
              <Text className="font-body-medium text-xs" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </Box>

      {value.preset === 'custom' && (
        <Box className="flex-row gap-2">
          <DatePickerField label="From" value={value.start} onChange={(iso) => onChange({ ...value, start: iso })} />
          <DatePickerField label="To" value={value.end} onChange={(iso) => onChange({ ...value, end: iso })} />
        </Box>
      )}
    </Box>
  );
}
