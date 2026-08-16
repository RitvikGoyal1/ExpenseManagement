import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { Box } from "@/components/ui/box";
import { FadeSlideIn } from "@/components/ui/FadeSlideIn";
import { GradientText } from "@/components/ui/GradientText";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { Text } from "@/components/ui/text";
import { springs } from "@/constants/motion";
import { colors } from "@/constants/theme";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { IncomeType } from "@/types/onboarding";
import { haptics } from "@/utils/haptics";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface IncomeOption {
  id: IncomeType;
  label: string;
  description: string;
  icon: IconName;
}

const INCOME_OPTIONS: IncomeOption[] = [
  {
    id: "salaried",
    label: "Salaried",
    description: "W-2 income from an employer",
    icon: "briefcase-outline",
  },
  {
    id: "freelancer",
    label: "Freelancer",
    description: "1099 income from gigs and contracts",
    icon: "laptop-outline",
  },
  {
    id: "business-owner",
    label: "Business Owner",
    description: "I run my own company or LLC",
    icon: "storefront-outline",
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const setIncomeType = useOnboardingStore((state) => state.setIncomeType);
  const [selected, setSelected] = useState<IncomeType | null>(null);

  const handleSelect = useCallback(
    (option: IncomeType) => {
      if (selected) {
        return;
      }
      haptics.impact(Haptics.ImpactFeedbackStyle.Medium);
      setSelected(option);
      setIncomeType(option);
      setTimeout(() => {
        router.push("/onboarding/import");
      }, 320);
    },
    [router, selected, setIncomeType],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <Box className="flex-1 px-8 pt-6">
        <FadeSlideIn className="mb-8 flex-row gap-1">
          <Box className="h-1 w-7 rounded-full bg-primary" />
          <Box className="h-1 w-7 rounded-full bg-border" />
        </FadeSlideIn>

        <FadeSlideIn delay={40}>
          <GradientText className="font-display-bold text-[32px] leading-[38px] tracking-[-0.6px] text-foreground">
            How do you earn your income?
          </GradientText>
          <Text className="mt-2 font-body text-base leading-[22px] text-secondary-foreground">
            This helps us tailor categories and insights to your situation.
          </Text>
        </FadeSlideIn>

        <Box className="mt-8 gap-4">
          {INCOME_OPTIONS.map((option, index) => (
            <FadeSlideIn key={option.id} delay={140 + index * 70}>
              <IncomeOptionCard
                option={option}
                isSelected={selected === option.id}
                isAnySelected={selected !== null}
                onSelect={() => handleSelect(option.id)}
              />
            </FadeSlideIn>
          ))}
        </Box>
      </Box>
    </SafeAreaView>
  );
}

interface IncomeOptionCardProps {
  option: IncomeOption;
  isSelected: boolean;
  isAnySelected: boolean;
  onSelect: () => void;
}

function IncomeOptionCard({
  option,
  isSelected,
  isAnySelected,
  onSelect,
}: IncomeOptionCardProps) {
  const checkPop = useSharedValue(0);
  const dim = useSharedValue(1);

  useEffect(() => {
    checkPop.value = withSpring(isSelected ? 1 : 0, springs.bouncy);
  }, [isSelected, checkPop]);

  useEffect(() => {
    dim.value = withSpring(
      isAnySelected && !isSelected ? 0.4 : 1,
      springs.default,
    );
  }, [isAnySelected, isSelected, dim]);

  const cardDimStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkPop.value,
    transform: [{ scale: checkPop.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    opacity: 1 - checkPop.value,
    position: "absolute",
  }));

  return (
    <Animated.View style={cardDimStyle}>
      <AnimatedPressable
        className={`flex-row items-center rounded-lg border-2 bg-card p-6 ${isSelected ? "border-primary bg-primary/16" : "border-border"}`}
        onPress={onSelect}
        disabled={isAnySelected}
      >
        <Box
          className={`mr-4 h-12 w-12 items-center justify-center rounded-md ${isSelected ? "bg-primary" : "bg-primary/16"}`}
        >
          <Ionicons
            name={option.icon}
            size={24}
            color={isSelected ? "#FFFFFF" : colors.primary}
          />
        </Box>
        <Box className="flex-1">
          <Text className="font-display-semibold text-[17px] text-foreground">
            {option.label}
          </Text>
          <Text className="mt-0.5 font-body text-[13px] text-muted-foreground">
            {option.description}
          </Text>
        </Box>
        <Box className="h-[22px] w-[22px] items-center justify-center">
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={colors.textMuted}
            />
          </Animated.View>
          <Animated.View style={checkStyle}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.primary}
            />
          </Animated.View>
        </Box>
      </AnimatedPressable>
    </Animated.View>
  );
}
