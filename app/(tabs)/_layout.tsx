import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AnimatedTabIcon } from '@/components/ui/AnimatedTabIcon';
import { Box } from '@/components/ui/box';
import { colors, fonts } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: 88,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <Box style={StyleSheet.absoluteFill}>
            <Box className="bg-background/[0.72]" style={StyleSheet.absoluteFill} />
            <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          </Box>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="scan-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="analytics-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: 'Tax',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="receipt-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name="settings-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
