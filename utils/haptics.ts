import * as Haptics from 'expo-haptics';

/**
 * expo-haptics calls return promises that reject on hardware without a
 * Taptic Engine (simulators, some Android devices). Left unhandled, that
 * rejection can surface as an uncaught native exception instead of a
 * catchable JS error. Haptics are a nice-to-have, never worth taking the
 * app down for, so every call site goes through here instead of calling
 * expo-haptics directly.
 */
function safe(action: () => Promise<void>) {
  action().catch(() => {});
}

export const haptics = {
  impact: (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) =>
    safe(() => Haptics.impactAsync(style)),
  selection: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
