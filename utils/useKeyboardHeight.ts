import { useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

// iOS fires the "will" events ahead of the animation, in step with the keyboard's own timing —
// letting the shared value tween in sync with it. Android only ever fires the "did" events, and
// (per RN's own docs) doesn't report a real `duration`, so 250ms is a reasonable stand-in.
const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
const FALLBACK_DURATION_MS = 250;

/**
 * A `Keyboard`-event-driven alternative to Reanimated's `useAnimatedKeyboard` — built on the
 * plain `Keyboard` module (always present, no native-binding version to fall out of sync with)
 * rather than Reanimated's own keyboard tracker, which requires its native side to be rebuilt in
 * lockstep with the JS package and isn't reliably available in every runtime (e.g. Expo Go can
 * lag behind the installed Reanimated version). Returns a shared value so callers can read the
 * live keyboard height from a worklet, e.g. to slide a bottom sheet clear of it.
 */
export function useKeyboardHeight(): SharedValue<number> {
  const height = useSharedValue(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(SHOW_EVENT, (event: KeyboardEvent) => {
      height.value = withTiming(event.endCoordinates.height, { duration: event.duration || FALLBACK_DURATION_MS });
    });
    const hideSubscription = Keyboard.addListener(HIDE_EVENT, (event: KeyboardEvent) => {
      height.value = withTiming(0, { duration: event.duration || FALLBACK_DURATION_MS });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [height]);

  return height;
}
