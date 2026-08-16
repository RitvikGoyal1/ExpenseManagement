import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { InteractionManager, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';

// Reanimated wraps the raw RN View here, not our gluestack Box — see
// AnimatedPressable for why (array-style + gluestack's className prop
// processing crashes React DOM on web). `className` still works via
// UniWind's JSX transform.
const AnimatedView = Animated.createAnimatedComponent(View);

interface TrendBadgeProps {
  percent: number;
  direction: 'up' | 'down';
  /** Whether this direction is a good outcome (e.g. spending trending down). */
  positive: boolean;
}

export function TrendBadge({ percent, direction, positive }: TrendBadgeProps) {
  const tint = positive ? colors.income : colors.expense;
  const icon = direction === 'up' ? 'arrow-up' : 'arrow-down';

  const pop = useSharedValue(0);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      pop.value = withDelay(450, withSpring(1, springs.bouncy));
    });
    return () => task.cancel();
  }, [pop]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.5 + pop.value * 0.5 }],
  }));

  return (
    <AnimatedView
      className={`flex-row items-center gap-0.5 self-start rounded-full px-2 py-1 ${positive ? 'bg-income/16' : 'bg-destructive/16'}`}
      style={popStyle}
    >
      <Ionicons name={icon} size={12} color={tint} />
      <Text className="font-mono-semibold text-xs" style={{ color: tint }}>
        {percent.toFixed(1)}%
      </Text>
    </AnimatedView>
  );
}
