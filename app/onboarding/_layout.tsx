import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      initialRouteName="profile"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.void } }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="import" />
    </Stack>
  );
}
