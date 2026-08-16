import { ReduceMotion, WithSpringConfig } from 'react-native-reanimated';

/**
 * Shared spring language for the whole app, mirroring Apple's
 * "damping ratio + response" spring model (see WWDC18 "Designing Fluid
 * Interfaces"). `dampingRatio: 1` is critically damped (no bounce);
 * lower values bounce. `duration` is a perceptual target, not a hard cutoff
 * — the spring settles when its energy decays, not on a timer.
 */
export const springs = {
  /** Default settle: menus, cards, entrances. No overshoot. */
  default: { duration: 400, dampingRatio: 1, reduceMotion: ReduceMotion.System } satisfies WithSpringConfig,
  /** Snappy, immediate press feedback. */
  press: { duration: 200, dampingRatio: 1, reduceMotion: ReduceMotion.System } satisfies WithSpringConfig,
  /** Momentum-carrying motion — flicks, drags, throws. */
  bouncy: { duration: 450, dampingRatio: 0.75, reduceMotion: ReduceMotion.System } satisfies WithSpringConfig,
  /** Sheets and drawers. */
  sheet: { duration: 350, dampingRatio: 0.8, reduceMotion: ReduceMotion.System } satisfies WithSpringConfig,
} as const;

/** Standard press-in scale for tactile feedback across buttons, cards, pills. */
export const PRESS_SCALE = 0.97;
