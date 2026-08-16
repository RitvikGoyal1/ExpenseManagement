import { useEffect } from 'react';
import { InteractionManager, View, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { springs } from '@/constants/motion';

// Reanimated wraps the raw RN View here, not our gluestack Box — see
// AnimatedPressable for why (array-style + gluestack's className prop
// processing crashes React DOM on web). `className` still works via
// UniWind's JSX transform.
const AnimatedView = Animated.createAnimatedComponent(View);

interface FadeSlideInProps extends ViewProps {
  /** Stagger offset in ms — pass `index * 60` to cascade a list in. */
  delay?: number;
  /** Starting vertical offset in px, settles to 0. */
  distance?: number;
  className?: string;
}

/**
 * Entrance wrapper: fades and slides content up into place with a
 * critically-damped spring. Compose several with increasing `delay` to
 * stagger a list or a stack of cards into view.
 */
export function FadeSlideIn({ delay = 0, distance = 16, style, children, ...rest }: FadeSlideInProps) {
  const progress = useSharedValue(0);

  // Intentionally runs once per mount only. `delay` is read purely as the
  // initial stagger offset — if a sibling's index (and thus delay) shifts
  // because the list reordered, this instance shouldn't replay its entrance.
  //
  // Deferred via runAfterInteractions so a burst of these mounting mid
  // screen-transition (e.g. a whole list appearing right as a navigator
  // swaps) doesn't compete with that native transition for the UI thread.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      progress.value = withDelay(delay, withSpring(1, springs.default));
    });
    return () => task.cancel();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));

  return (
    <AnimatedView style={[style, animatedStyle]} {...rest}>
      {children}
    </AnimatedView>
  );
}
