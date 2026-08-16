'use client';
import React from 'react';
import { SafeAreaView as RNSafeAreaView, SafeAreaViewProps as RNSafeAreaViewProps } from 'react-native-safe-area-context';
import { useResolveClassNames } from 'uniwind';

// `react-native-safe-area-context`'s SafeAreaView is a strictly-typed Fabric
// native component — it doesn't understand `className`. Passing it directly
// (as raw react-native-safe-area-context exports would) corrupts Yoga's
// layout/height measurement for every descendant Text node. Resolve the
// className to a style object ourselves instead of forwarding it.
interface SafeAreaViewProps extends RNSafeAreaViewProps {
  className?: string;
}

export const SafeAreaView = React.forwardRef<
  React.ComponentRef<typeof RNSafeAreaView>,
  SafeAreaViewProps
>(function SafeAreaView({ className, style, ...props }, ref) {
  const classNameStyle = useResolveClassNames(className ?? '');
  return <RNSafeAreaView ref={ref} {...props} style={[classNameStyle, style]} />;
});
