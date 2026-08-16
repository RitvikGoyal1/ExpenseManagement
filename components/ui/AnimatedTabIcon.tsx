import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { InteractionManager, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { springs } from '@/constants/motion';

// Reanimated wraps the raw RN View here, not our gluestack Box — see
// AnimatedPressable for why (array-style + gluestack's className prop
// processing crashes React DOM on web). `className` still works via
// UniWind's JSX transform. The outer Box below has no animated style, so
// it's unaffected and stays as-is.
const AnimatedView = Animated.createAnimatedComponent(View);

type IconName = ComponentProps<typeof Ionicons>['name'];

interface AnimatedTabIconProps {
  name: IconName;
  color: string;
  focused: boolean;
}

/**
 * Tab icon that bounces up on a soft highlight pill when it becomes the
 * active tab, and settles back down when it loses focus — the tab bar
 * equivalent of iOS's springy selection feedback.
 */
export function AnimatedTabIcon({ name, color, focused }: AnimatedTabIconProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      progress.value = withSpring(focused ? 1 : 0, springs.bouncy);
    });
    return () => task.cancel();
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.16 }, { translateY: progress.value * -1 }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  return (
    <Box className="h-8 w-11 items-center justify-center">
      <AnimatedView className="absolute h-8 w-11 rounded-full bg-primary/16" style={pillStyle} />
      <Animated.View style={iconStyle}>
        <Ionicons name={name} size={24} color={color} />
      </Animated.View>
    </Box>
  );
}
