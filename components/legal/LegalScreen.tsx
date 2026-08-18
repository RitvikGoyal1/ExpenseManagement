import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { LegalSection } from '@/constants/legalContent';

interface LegalScreenProps {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export function LegalScreen({ title, effectiveDate, sections }: LegalScreenProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Box className="flex-row items-center justify-between px-4 pb-2">
        <AnimatedPressable
          className="h-9 w-9 items-center justify-center rounded-full"
          onPress={() => router.back()}
          scaleTo={0.85}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text className="font-body-semibold text-[15px] text-foreground">{title}</Text>
        <Box className="h-9 w-9" />
      </Box>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-1 font-display-bold text-[26px] tracking-[-0.5px] text-foreground">{title}</Text>
        <Text className="mb-6 font-mono text-[11px] tracking-[0.5px] text-muted-foreground">
          EFFECTIVE {effectiveDate.toUpperCase()}
        </Text>

        {sections.map((section) => (
          <Box key={section.heading} className="mb-6">
            <Text className="mb-2 font-body-bold text-[15px] text-foreground">{section.heading}</Text>
            {section.body.map((paragraph, index) => (
              <Text
                key={index}
                className={`font-body text-[13px] leading-[20px] text-secondary-foreground ${index > 0 ? 'mt-2' : ''}`}
              >
                {paragraph}
              </Text>
            ))}
          </Box>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
