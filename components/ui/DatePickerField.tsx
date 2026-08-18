import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { MiniCalendar } from '@/components/ui/MiniCalendar';
import { Pressable as GluePressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

const OPEN_DURATION_MS = 220;
const CLOSE_DURATION_MS = 160;

interface DatePickerFieldProps {
  label: string;
  /** ISO date string, or null when unset. */
  value: string | null;
  onChange: (iso: string) => void;
}

/**
 * A pressable "date pill" that opens a small centered popover with a MiniCalendar — replaces a
 * plain chevron stepper with an actual calendar so picking a date doesn't mean tapping ±1 day
 * dozens of times to get somewhere a month out.
 */
export function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => (value ? new Date(value) : new Date()));
  // Bumped on every open — remounts MiniCalendar so it always starts back on the day grid instead
  // of wherever a previous session's month/year drill-up left it.
  const [session, setSession] = useState(0);
  const progress = useSharedValue(0);

  const selected = value ? new Date(value) : null;
  const formatted = value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const openPicker = () => {
    setVisibleMonth(selected ?? new Date());
    setSession((current) => current + 1);
    setIsOpen(true);
    progress.value = withTiming(1, { duration: OPEN_DURATION_MS });
  };

  const closePicker = useCallback(() => {
    progress.value = withTiming(0, { duration: CLOSE_DURATION_MS }, (finished) => {
      if (finished) {
        runOnJS(setIsOpen)(false);
      }
    });
  }, [progress]);

  const handleSelectDay = (date: Date) => {
    onChange(date.toISOString());
    closePicker();
  };

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  return (
    <Box className="flex-1 gap-1">
      <Text className="font-body text-[11px] text-muted-foreground">{label}</Text>
      <GluePressable
        onPress={openPicker}
        className="flex-row items-center justify-between rounded-md border border-border bg-card px-3 py-2"
      >
        <Text className="font-body-semibold text-[13px] text-foreground">{formatted}</Text>
        <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
      </GluePressable>

      <Modal visible={isOpen} transparent animationType="none" onRequestClose={closePicker}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closePicker}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.textPrimary }, backdropStyle]} />
        </Pressable>

        <Box className="flex-1 items-center justify-center px-10">
          <Animated.View
            style={[
              {
                width: '100%',
                maxWidth: 320,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                backgroundColor: colors.surface,
                padding: 16,
                shadowColor: colors.textPrimary,
                shadowOpacity: 0.2,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
              },
              cardStyle,
            ]}
          >
            <MiniCalendar
              key={session}
              visibleMonth={visibleMonth}
              onVisibleMonthChange={setVisibleMonth}
              selected={selected}
              onSelectDay={handleSelectDay}
            />
          </Animated.View>
        </Box>
      </Modal>
    </Box>
  );
}
