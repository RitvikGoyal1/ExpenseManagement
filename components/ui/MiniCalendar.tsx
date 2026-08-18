import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { haptics } from '@/utils/haptics';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKS_TO_RENDER = 6;
const YEARS_PER_PAGE = 12;

type ViewMode = 'days' | 'months' | 'years';

interface MiniCalendarProps {
  /** Only the year/month are read — which month's day grid to draw. */
  visibleMonth: Date;
  onVisibleMonthChange: (date: Date) => void;
  /** The currently selected day, if any — highlighted. */
  selected: Date | null;
  onSelectDay: (date: Date) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildDayGrid(visibleMonth: Date): { date: Date; inCurrentMonth: boolean }[] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const startOffset = new Date(year, month, 1).getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: WEEKS_TO_RENDER * 7 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { date, inCurrentMonth: date.getMonth() === month };
  });
}

/**
 * A month-grid day picker that drills up two levels — tap the header to jump from a day grid to a
 * 12-month grid, then again to a page of years — so getting to a date months or years away doesn't
 * mean stepping through every month in between one at a time.
 */
export function MiniCalendar({ visibleMonth, onVisibleMonthChange, selected, onSelectDay }: MiniCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [yearsPageStart, setYearsPageStart] = useState(
    () => Math.floor(visibleMonth.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE,
  );

  const today = new Date();

  const headerLabel =
    viewMode === 'days'
      ? visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : viewMode === 'months'
        ? String(visibleMonth.getFullYear())
        : `${yearsPageStart} – ${yearsPageStart + YEARS_PER_PAGE - 1}`;

  const handlePrev = () => {
    haptics.selection();
    if (viewMode === 'days') {
      onVisibleMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
    } else if (viewMode === 'months') {
      onVisibleMonthChange(new Date(visibleMonth.getFullYear() - 1, visibleMonth.getMonth(), 1));
    } else {
      setYearsPageStart((start) => start - YEARS_PER_PAGE);
    }
  };

  const handleNext = () => {
    haptics.selection();
    if (viewMode === 'days') {
      onVisibleMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
    } else if (viewMode === 'months') {
      onVisibleMonthChange(new Date(visibleMonth.getFullYear() + 1, visibleMonth.getMonth(), 1));
    } else {
      setYearsPageStart((start) => start + YEARS_PER_PAGE);
    }
  };

  const handleHeaderPress = () => {
    if (viewMode === 'years') {
      return; // already at the top level
    }
    haptics.selection();
    if (viewMode === 'days') {
      setViewMode('months');
    } else {
      setYearsPageStart(Math.floor(visibleMonth.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);
      setViewMode('years');
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    haptics.selection();
    onVisibleMonthChange(new Date(visibleMonth.getFullYear(), monthIndex, 1));
    setViewMode('days');
  };

  const handleSelectYear = (year: number) => {
    haptics.selection();
    onVisibleMonthChange(new Date(year, visibleMonth.getMonth(), 1));
    setViewMode('months');
  };

  return (
    <Box className="gap-3">
      <Box className="flex-row items-center justify-between">
        <AnimatedPressable className="h-8 w-8 items-center justify-center rounded-full" onPress={handlePrev} scaleTo={0.85} hitSlop={6}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </AnimatedPressable>

        {viewMode === 'years' ? (
          <Text className="font-body-semibold text-[14px] text-foreground">{headerLabel}</Text>
        ) : (
          <Pressable onPress={handleHeaderPress} className="flex-row items-center gap-1 rounded-md px-2 py-1">
            <Text className="font-body-semibold text-[14px] text-foreground">{headerLabel}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </Pressable>
        )}

        <AnimatedPressable className="h-8 w-8 items-center justify-center rounded-full" onPress={handleNext} scaleTo={0.85} hitSlop={6}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </AnimatedPressable>
      </Box>

      {viewMode === 'days' && (
        <>
          <Box className="flex-row">
            {WEEKDAY_LABELS.map((label, index) => (
              <Box key={`${label}-${index}`} className="flex-1 items-center">
                <Text className="font-mono text-[10px] text-muted-foreground">{label}</Text>
              </Box>
            ))}
          </Box>

          <Box className="flex-row flex-wrap">
            {buildDayGrid(visibleMonth).map(({ date, inCurrentMonth }) => {
              const isSelected = selected !== null && isSameDay(date, selected);
              const isToday = isSameDay(date, today);

              return (
                <Box key={date.toISOString()} style={{ width: `${100 / 7}%` }} className="items-center py-0.5">
                  <Pressable
                    onPress={() => {
                      haptics.selection();
                      onSelectDay(date);
                    }}
                    className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-primary' : ''}`}
                  >
                    <Text
                      className="font-body-medium text-[13px]"
                      style={{ color: isSelected ? colors.glass : inCurrentMonth ? colors.textPrimary : colors.textMuted }}
                    >
                      {date.getDate()}
                    </Text>
                    {isToday && !isSelected && <Box className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
                  </Pressable>
                </Box>
              );
            })}
          </Box>
        </>
      )}

      {viewMode === 'months' && (
        <Box className="flex-row flex-wrap">
          {MONTH_LABELS.map((label, index) => {
            const isSelected = selected !== null && selected.getFullYear() === visibleMonth.getFullYear() && selected.getMonth() === index;
            const isCurrentMonth = today.getFullYear() === visibleMonth.getFullYear() && today.getMonth() === index;

            return (
              <Box key={label} style={{ width: `${100 / 3}%` }} className="items-center py-1">
                <Pressable
                  onPress={() => handleSelectMonth(index)}
                  className={`w-[92%] items-center rounded-md py-3 ${isSelected ? 'bg-primary' : ''}`}
                >
                  <Text className="font-body-medium text-[13px]" style={{ color: isSelected ? colors.glass : colors.textPrimary }}>
                    {label}
                  </Text>
                  {isCurrentMonth && !isSelected && <Box className="mt-1 h-1 w-1 rounded-full bg-primary" />}
                </Pressable>
              </Box>
            );
          })}
        </Box>
      )}

      {viewMode === 'years' && (
        <Box className="flex-row flex-wrap">
          {Array.from({ length: YEARS_PER_PAGE }, (_, index) => yearsPageStart + index).map((year) => {
            const isSelected = selected !== null && selected.getFullYear() === year;
            const isCurrentYear = today.getFullYear() === year;

            return (
              <Box key={year} style={{ width: `${100 / 3}%` }} className="items-center py-1">
                <Pressable
                  onPress={() => handleSelectYear(year)}
                  className={`w-[92%] items-center rounded-md py-3 ${isSelected ? 'bg-primary' : ''}`}
                >
                  <Text className="font-body-medium text-[13px]" style={{ color: isSelected ? colors.glass : colors.textPrimary }}>
                    {year}
                  </Text>
                  {isCurrentYear && !isSelected && <Box className="mt-1 h-1 w-1 rounded-full bg-primary" />}
                </Pressable>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
