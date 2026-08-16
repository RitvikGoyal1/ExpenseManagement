import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { formatCurrency } from '@/utils/format';

interface AnimatedCurrencyProps extends React.ComponentProps<typeof Text> {
  value: number;
  delay?: number;
}

/** Text that springs from 0 up to `value`, counting up as it settles. */
export function AnimatedCurrency({ value, delay = 0, style, ...rest }: AnimatedCurrencyProps) {
  const animated = useSharedValue(0);
  const [display, setDisplay] = useState(() => formatCurrency(0));

  useEffect(() => {
    // Deferred so this doesn't compete with an in-flight navigator
    // transition for the UI thread (see FadeSlideIn for the same reasoning).
    const task = InteractionManager.runAfterInteractions(() => {
      animated.value = withDelay(delay, withSpring(value, springs.default));
    });
    return () => task.cancel();
    // Runs whenever the target value itself changes (e.g. new transaction),
    // not on every re-render — `delay` is only the initial stagger offset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useAnimatedReaction(
    () => animated.value,
    (current) => {
      runOnJS(setDisplay)(formatCurrency(current));
    },
  );

  return (
    <Text style={style} {...rest}>
      {display}
    </Text>
  );
}
