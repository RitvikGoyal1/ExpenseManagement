import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function TransactionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.void },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
