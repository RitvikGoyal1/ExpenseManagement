import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { haptics } from "@/utils/haptics";

// Fabricated but plausible — mirrors the real extraction Gemini performs in
// ocrService (vendor, total, category, tax deductibility) so the copy reads
// as truthful narration rather than a generic spinner label.
const STEPS = [
  "Scanning receipt with AI vision",
  "Reading vendor & total",
  "Detecting spending category",
  "Checking tax deductibility",
  "Finalizing entry",
] as const;

const STEP_INTERVAL_MS = 1150;
const SWEEP_DURATION_MS = 1700;
const SWEEP_BAND_HEIGHT = 90;

/**
 * Full-bleed overlay shown while Gemini reads the captured receipt.
 * Steps advance and clamp at the last one (same pattern as the inbox-import
 * sync screen) so the wait reads as visible, honest progress rather than a
 * bare spinner — regardless of how long the real API call actually takes.
 */
export function AIScanningOverlay() {
  const [stepIndex, setStepIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const textOpacity = useSharedValue(1);
  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_DURATION_MS,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 }),
      ),
      -1,
      false,
    );
    ringA.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    // Delayed start only offsets the first cycle, staggering ringB half a
    // period behind ringA for a continuous alternating "radar ping" instead
    // of both rings pulsing in lockstep.
    ringB.value = withDelay(
      900,
      withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [sweep, pulse, ringA, ringB]);

  useEffect(() => {
    let step = 0;
    stepIntervalRef.current = setInterval(() => {
      if (step >= STEPS.length - 1) {
        if (stepIntervalRef.current) {
          clearInterval(stepIntervalRef.current);
        }
        return;
      }
      textOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 280 }),
      );
      // Swap the label once it's fully faded out, not mid-fade.
      setTimeout(() => {
        step += 1;
        haptics.selection();
        setStepIndex(step);
      }, 150);
    }, STEP_INTERVAL_MS);

    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          sweep.value * Math.max(containerHeight - SWEEP_BAND_HEIGHT, 0),
      },
    ],
  }));
  const ringStyleA = useAnimatedStyle(() => ({
    opacity: (1 - ringA.value) * 0.45,
    transform: [{ scale: 0.6 + ringA.value * 0.75 }],
  }));
  const ringStyleB = useAnimatedStyle(() => ({
    opacity: (1 - ringB.value) * 0.45,
    transform: [{ scale: 0.6 + ringB.value * 0.75 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.15 }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setContainerHeight(event.nativeEvent.layout.height)}
    >
      <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
      <Box className="bg-black/[0.32]" style={StyleSheet.absoluteFill} />

      <Animated.View
        style={[styles.sweepBand, sweepStyle, { pointerEvents: "none" }]}
      >
        <LinearGradient
          colors={["transparent", "rgba(172,138,70,0.5)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Box className="flex-1 items-center justify-center gap-6 px-10">
        <Box className="flex-row items-center gap-1.5 self-center rounded-full border border-gold/40 bg-gold/16 px-3 py-1">
          <Ionicons name="sparkles" size={12} color={colors.gold} />
          <Text className="font-mono text-[10px] tracking-[1.5px] text-gold">
            GEMINI AI
          </Text>
        </Box>

        <Box className="items-center justify-center" style={styles.badgeArea}>
          <Animated.View style={[styles.ring, ringStyleA]} />
          <Animated.View style={[styles.ring, ringStyleB]} />
          <Animated.View style={[styles.glow, glowStyle]} />
          <Box
            className="h-16 w-16 items-center justify-center rounded-full border border-gold/50 bg-gold/20"
            style={{
              shadowColor: colors.gold,
              shadowRadius: 16,
              shadowOpacity: 0.5,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            <Ionicons name="sparkles" size={26} color={colors.gold} />
          </Box>
        </Box>

        <Animated.View style={textStyle}>
          <Text className="text-center font-display-semibold text-[17px] leading-[22px] text-glass">
            {STEPS[stepIndex]}…
          </Text>
        </Animated.View>

        <Box className="flex-row gap-1.5">
          {STEPS.map((step, index) => (
            <Box
              key={step}
              className="h-1.5 rounded-full"
              style={{
                width: index === stepIndex ? 20 : 6,
                backgroundColor:
                  index <= stepIndex ? colors.gold : "rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </Box>
      </Box>
    </View>
  );
}

const RING_SIZE = 108;

const styles = StyleSheet.create({
  badgeArea: {
    height: RING_SIZE,
    width: RING_SIZE,
  },
  ring: {
    position: "absolute",
    height: RING_SIZE,
    width: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  glow: {
    position: "absolute",
    height: 84,
    width: 84,
    borderRadius: 42,
    backgroundColor: colors.gold,
  },
  sweepBand: {
    position: "absolute",
    left: 0,
    right: 0,
    height: SWEEP_BAND_HEIGHT,
  },
});
