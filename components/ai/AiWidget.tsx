import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';

import { AiInsightSheet } from '@/components/ai/AiInsightSheet';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { cardShadow, colors } from '@/constants/theme';
import { QuickPrompt } from '@/types/analytics';
import { haptics } from '@/utils/haptics';

interface AiWidgetProps {
  prompts: QuickPrompt[];
}

export function AiWidget({ prompts }: AiWidgetProps) {
  const [activePrompt, setActivePrompt] = useState<QuickPrompt | null>(null);

  const handlePromptPress = useCallback((prompt: QuickPrompt) => {
    haptics.selection();
    setActivePrompt(prompt);
  }, []);

  return (
    <>
      {/* A faint brass-tinted gradient (rather than the dark theme's inverted
          gradient card) — just enough richness to mark this as the one
          AI-touched surface, without breaking the paper-and-ink palette. */}
      <LinearGradient
        colors={['#FFFFFF', '#FBF6EC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border }, cardShadow]}
      >
        <Box className="flex-row items-center">
          <Box className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-gold/16">
            <Ionicons name="sparkles" size={18} color={colors.gold} />
          </Box>
          <Box className="flex-1">
            <Text className="font-display-semibold text-[17px] text-foreground">AI Assistant</Text>
            <Text className="mt-px font-body text-xs text-secondary-foreground">Personally trained on your finances</Text>
          </Box>
        </Box>

        <Box className="mt-6 flex-row flex-wrap gap-2">
          {prompts.map((prompt) => (
            <AnimatedPressable
              key={prompt.id}
              className="rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-2"
              onPress={() => handlePromptPress(prompt)}
            >
              <Text className="font-body-medium text-[13px] text-foreground">{prompt.question}</Text>
            </AnimatedPressable>
          ))}
        </Box>
      </LinearGradient>

      <AiInsightSheet prompt={activePrompt} onClose={() => setActivePrompt(null)} />
    </>
  );
}
