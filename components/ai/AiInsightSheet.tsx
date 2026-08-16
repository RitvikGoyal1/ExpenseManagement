import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import { QuickPrompt } from '@/types/analytics';
import { haptics } from '@/utils/haptics';

// Far enough below the screen to guarantee full concealment on any device.
const HIDDEN_OFFSET = 620;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 800;
// How much "give" the sheet has when dragged upward past its resting point.
const RUBBER_BAND_DIMENSION = 60;

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

interface AiInsightSheetProps {
  prompt: QuickPrompt | null;
  onClose: () => void;
}

/**
 * A hand-built spring/gesture bottom sheet rather than the platform Modal
 * slide: draggable with 1:1 tracking, rubber-bands against its own top edge,
 * and either snaps back or dismisses using the release velocity depending
 * on how far/fast it was thrown — never a fixed-duration slide.
 */
export function AiInsightSheet({ prompt, onClose }: AiInsightSheetProps) {
  const translateY = useSharedValue(HIDDEN_OFFSET);
  const hasCrossedThreshold = useSharedValue(false);

  useEffect(() => {
    if (prompt) {
      translateY.value = HIDDEN_OFFSET;
      translateY.value = withSpring(0, springs.sheet);
      hasCrossedThreshold.value = false;
    }
  }, [prompt, translateY, hasCrossedThreshold]);

  const notifyThresholdCrossed = useCallback(() => {
    haptics.impact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const animateClosed = useCallback(
    (velocity = 0) => {
      translateY.value = withSpring(HIDDEN_OFFSET, { ...springs.sheet, velocity }, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    },
    [onClose, translateY],
  );

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = rubberband(event.translationY, RUBBER_BAND_DIMENSION);
      } else {
        translateY.value = event.translationY;
      }

      const crossed = event.translationY > DISMISS_DISTANCE;
      if (crossed !== hasCrossedThreshold.value) {
        hasCrossedThreshold.value = crossed;
        if (crossed) {
          runOnJS(notifyThresholdCrossed)();
        }
      }
    })
    .onEnd((event) => {
      const shouldDismiss = event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        translateY.value = withSpring(HIDDEN_OFFSET, { ...springs.sheet, velocity: event.velocityY }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
        });
      } else {
        translateY.value = withSpring(0, { ...springs.sheet, velocity: event.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, 1 - translateY.value / HIDDEN_OFFSET)) * 0.6,
  }));

  return (
    <Modal visible={prompt !== null} transparent animationType="none" onRequestClose={() => animateClosed()}>
      {/* Modal content lives in a separate native hierarchy — gesture-handler
          needs its own root here, the app-level one doesn't reach inside. */}
      <GestureHandlerRootView style={styles.fill}>
        <Box className="flex-1 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => animateClosed()}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#020203' }, backdropStyle]} />
          </Pressable>

          {prompt && (
            <GestureDetector gesture={pan}>
              <Animated.View
                style={[
                  { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.borderStrong, borderBottomWidth: 0, overflow: 'hidden', padding: 24, paddingBottom: 32 },
                  sheetStyle,
                ]}
              >
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                <Box className="bg-white/[0.6]" style={StyleSheet.absoluteFill} />

                <Box className="mb-4 h-1 w-10 self-center rounded-full bg-foreground/20" />

                <Box className="mb-6 flex-row items-center">
                  <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gold/16">
                    <Ionicons name="sparkles" size={16} color={colors.gold} />
                  </Box>
                  <Text className="flex-1 font-display-semibold text-base text-foreground">AI Assistant</Text>
                  <AnimatedPressable onPress={() => animateClosed()} hitSlop={8} scaleTo={0.85}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </AnimatedPressable>
                </Box>

                <Box className="mb-4 max-w-[85%] self-end rounded-lg bg-primary/16 px-4 py-2" style={{ borderBottomRightRadius: 4 }}>
                  <Text className="font-body-semibold text-sm text-foreground">{prompt.question}</Text>
                </Box>

                <Box className="flex-row items-start">
                  <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gold/16">
                    <Ionicons name="sparkles" size={14} color={colors.gold} />
                  </Box>
                  <Box
                    className="flex-1 rounded-lg border border-border bg-muted px-4 py-2"
                    style={{ borderBottomLeftRadius: 4 }}
                  >
                    <Text className="font-body text-sm leading-5 text-foreground">{prompt.insight}</Text>
                  </Box>
                </Box>

                <AnimatedPressable
                  className="mt-6 items-center rounded-lg bg-gold py-3.5"
                  style={{ shadowColor: colors.gold, shadowRadius: 12, shadowOpacity: 0.22, shadowOffset: { width: 0, height: 4 } }}
                  onPress={() => animateClosed()}
                >
                  <Text className="font-body-semibold text-[15px] text-gold-foreground">Got it</Text>
                </AnimatedPressable>
              </Animated.View>
            </GestureDetector>
          )}
        </Box>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
