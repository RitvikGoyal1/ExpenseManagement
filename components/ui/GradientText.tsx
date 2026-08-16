import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui/text';

interface GradientTextProps {
  children: string;
  className?: string;
  colors?: readonly [string, string, ...string[]];
}

/**
 * Gradient-masked text for static hero titles. Deliberately not used for
 * anything that re-renders every frame (e.g. a live count-up) — masking is
 * an extra native compositing layer per render, cheap once, not 30x/second.
 */
export function GradientText({ children, className, colors = ['#14161B', '#2A3B5C'] }: GradientTextProps) {
  return (
    <MaskedView maskElement={<Text className={className}>{children}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text className={className} style={{ opacity: 0 }}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
