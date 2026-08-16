import { forwardRef } from 'react';
import { Pressable, PressableProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { PRESS_SCALE, springs } from '@/constants/motion';

// Reanimated wraps the raw RN Pressable here, not our gluestack Pressable —
// gluestack's Box/Pressable do their own prop processing for `className`
// which conflicts with Reanimated's array-style flattening on web (it
// crashes React DOM trying to assign a style array as an indexed property).
// `className` still works on the raw component via UniWind's JSX transform.
const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  /** Scale to animate to on press-in. Defaults to the app-wide press scale. */
  scaleTo?: number;
  className?: string;
}

/**
 * Drop-in Pressable that gives every tap the same tactile spring feedback:
 * scales down the instant the finger touches down (not on release) and
 * springs back on release or cancel. Use this instead of a bare Pressable
 * anywhere in the app that should feel alive.
 */
export const AnimatedPressable = forwardRef<View, AnimatedPressableProps>(function AnimatedPressable(
  { style, scaleTo = PRESS_SCALE, onPressIn, onPressOut, children, ...rest },
  ref,
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReanimatedPressable
      ref={ref}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, springs.press);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, springs.press);
        onPressOut?.(event);
      }}
      {...rest}
    >
      {children}
    </ReanimatedPressable>
  );
});
