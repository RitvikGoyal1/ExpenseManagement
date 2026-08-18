import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Input, InputField } from '@/components/ui/input';
import { colors } from '@/constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

/** Matches vendor name or any receipt line-item description — see useTransactionFilters. */
export function SearchBar({ value, onChangeText, placeholder = 'Search vendor or item…' }: SearchBarProps) {
  return (
    <Input className="h-10 flex-row items-center rounded-md border border-border bg-card px-3">
      <Ionicons name="search" size={16} color={colors.textMuted} />
      <InputField
        className="ml-2"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <AnimatedPressable onPress={() => onChangeText('')} hitSlop={8} scaleTo={0.85}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </AnimatedPressable>
      )}
    </Input>
  );
}
