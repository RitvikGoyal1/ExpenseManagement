import { useEffect, useRef, useState } from 'react';

import { Text } from '@/components/ui/text';
import { formatCurrency } from '@/utils/format';

interface AnimatedCurrencyProps extends React.ComponentProps<typeof Text> {
  value: number;
  delay?: number;
}

const DURATION_MS = 400;

// No-overshoot ease-out, matching the feel of the critically-damped spring
// (dampingRatio: 1) this used to run on Reanimated's UI thread.
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Text that counts up from 0 to `value` on a settling ease-out curve.
 *
 * Deliberately plain JS (rAF + setState), not Reanimated. This used to run
 * the count-up as a shared value and sync it to text via
 * `useAnimatedReaction` + `runOnJS`, but that cross-thread call is exactly
 * the pattern implicated in several open react-native-worklets crash
 * reports (use-after-free in `scheduleOnRN`/`runOnJS` when components
 * mount/unmount quickly during a screen transition — see
 * software-mansion/react-native-reanimated#9776, #1548). This component
 * mounts for the first time in exactly that situation (right as onboarding
 * hard-swaps into the tab navigator), so it stays off the UI thread.
 */
export function AnimatedCurrency({ value, delay = 0, style, ...rest }: AnimatedCurrencyProps) {
  const [display, setDisplay] = useState(() => formatCurrency(0));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;

    function tick(timestamp: number) {
      if (start === null) {
        start = timestamp;
      }
      const progress = Math.min((timestamp - start) / DURATION_MS, 1);
      setDisplay(formatCurrency(easeOutCubic(progress) * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    const timeoutId = setTimeout(() => {
      frameRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
    // Runs whenever the target value itself changes (e.g. new transaction),
    // not on every re-render — `delay` is only the initial stagger offset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Text style={style} {...rest}>
      {display}
    </Text>
  );
}
