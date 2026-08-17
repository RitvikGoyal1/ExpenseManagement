import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListRenderItemInfo, Modal, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { RNFlatList } from '@/components/ui/flat-list';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import { getFinancialChatReply } from '@/services/aiChatService';
import { BalanceSheet, CashFlowSummary, ChatMessage, QuickPrompt, SpendingCategory } from '@/types/analytics';
import { haptics } from '@/utils/haptics';
import { useKeyboardHeight } from '@/utils/useKeyboardHeight';

// Far enough below the screen to guarantee full concealment on any device.
const HIDDEN_OFFSET = 620;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 800;
// How much "give" the sheet has when dragged upward past its resting point.
const RUBBER_BAND_DIMENSION = 60;

const FALLBACK_REPLY = "I couldn't reach the AI just now — check your connection (or the Gemini API key) and try again.";

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

interface AiInsightSheetProps {
  prompt: QuickPrompt | null;
  onClose: () => void;
  spendingCategories: SpendingCategory[];
  cashFlow: CashFlowSummary;
  balanceSheet: BalanceSheet;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <Box className="mb-3 max-w-[85%] self-end rounded-lg bg-primary px-4 py-2.5" style={{ borderBottomRightRadius: 4 }}>
        <Text className="font-body-semibold text-sm text-glass">{message.text}</Text>
      </Box>
    );
  }

  return (
    <Box className="mb-3 max-w-[85%] flex-row items-start self-start">
      <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gold/16">
        <Ionicons name="sparkles" size={14} color={colors.gold} />
      </Box>
      <LinearGradient
        colors={['#FFFFFF', '#FBF6EC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexShrink: 1,
          borderRadius: 12,
          borderBottomLeftRadius: 4,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text className="font-body text-sm leading-5 text-foreground">{message.text}</Text>
      </LinearGradient>
    </Box>
  );
}

function TypingIndicator() {
  return (
    <Box className="mb-3 flex-row items-center">
      <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gold/16">
        <Ionicons name="sparkles" size={14} color={colors.gold} />
      </Box>
      <Box className="rounded-lg border border-border bg-muted px-4 py-2.5" style={{ borderBottomLeftRadius: 4 }}>
        <Text className="font-body text-sm text-muted-foreground">AI is thinking…</Text>
      </Box>
    </Box>
  );
}

/**
 * A hand-built spring/gesture bottom sheet rather than the platform Modal
 * slide: draggable with 1:1 tracking, rubber-bands against its own top edge,
 * and either snaps back or dismisses using the release velocity depending
 * on how far/fast it was thrown — never a fixed-duration slide.
 *
 * Doubles as the app's chat surface: a `prompt` tap from AiWidget seeds the
 * conversation with that quick prompt's question, and the input row at the
 * bottom accepts free-form follow-ups. Both paths call Gemini directly,
 * grounded in the analytics screen's current numbers via a system
 * instruction (see services/aiChatService.ts) — nothing here is canned.
 */
export function AiInsightSheet({ prompt, onClose, spendingCategories, cashFlow, balanceSheet }: AiInsightSheetProps) {
  const translateY = useSharedValue(HIDDEN_OFFSET);
  const hasCrossedThreshold = useSharedValue(false);
  // Not KeyboardAvoidingView — this sheet lives inside a Modal with a transform-driven position,
  // and KeyboardAvoidingView's frame measurement doesn't account for that reliably (confirmed
  // broken on iOS). Sliding the sheet itself up by the live keyboard height sidesteps the
  // measurement entirely.
  const keyboardHeight = useKeyboardHeight();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  const listRef = useRef<RNFlatList<ChatMessage>>(null);
  const wasOpenRef = useRef(false);
  const idCounterRef = useRef(0);
  // Mirrors `messages` synchronously so a reply's request can be built with the exact history that
  // preceded it, without waiting a render cycle for `messages` state to catch up.
  const messagesRef = useRef<ChatMessage[]>([]);
  // Bumped on every new question — a reply only gets applied if this still matches the id it was
  // sent with, so a stale response (sheet closed and reopened with a new prompt mid-flight) is
  // silently dropped instead of appearing in the wrong conversation.
  const activeRequestIdRef = useRef(0);

  const context = useMemo(() => ({ spendingCategories, cashFlow, balanceSheet }), [spendingCategories, cashFlow, balanceSheet]);

  const nextId = useCallback((role: ChatMessage['role']) => {
    idCounterRef.current += 1;
    return `${role}-${idCounterRef.current}`;
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    messagesRef.current = [...messagesRef.current, message];
    setMessages(messagesRef.current);
  }, []);

  const requestReply = useCallback(
    async (question: string, historyBeforeQuestion: ChatMessage[]) => {
      const requestId = ++activeRequestIdRef.current;
      setIsTyping(true);
      try {
        const reply = await getFinancialChatReply(question, historyBeforeQuestion, context);
        if (requestId !== activeRequestIdRef.current) {
          return;
        }
        appendMessage({ id: nextId('ai'), role: 'ai', text: reply });
      } catch (error) {
        if (requestId !== activeRequestIdRef.current) {
          return;
        }
        console.warn('[AI Chat] Gemini reply failed:', error);
        appendMessage({ id: nextId('ai'), role: 'ai', text: FALLBACK_REPLY });
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsTyping(false);
        }
      }
    },
    [appendMessage, context, nextId],
  );

  useEffect(() => {
    if (!prompt) {
      wasOpenRef.current = false;
      return;
    }

    const isFreshOpen = !wasOpenRef.current;
    const historyBeforeQuestion = isFreshOpen ? [] : messagesRef.current;

    if (isFreshOpen) {
      wasOpenRef.current = true;
      messagesRef.current = [];
      setMessages([]);
      setIsTyping(false);
      setInputText('');
      translateY.value = HIDDEN_OFFSET;
      translateY.value = withSpring(0, springs.sheet);
      hasCrossedThreshold.value = false;
    }

    appendMessage({ id: nextId('user'), role: 'user', text: prompt.question });
    requestReply(prompt.question, historyBeforeQuestion);
    // Re-fires only when a *different* QuickPrompt object is tapped — mockQuickPrompts entries are
    // stable references, so re-tapping the same pill intentionally no-ops rather than re-asking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const notifyThresholdCrossed = useCallback(() => {
    haptics.impact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const animateClosed = useCallback(
    (velocity = 0) => {
      translateY.value = withSpring(HIDDEN_OFFSET, { ...springs.sheet, velocity }, (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    },
    [onClose, translateY],
  );

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      return;
    }

    haptics.selection();
    const historyBeforeQuestion = messagesRef.current;
    appendMessage({ id: nextId('user'), role: 'user', text: trimmed });
    setInputText('');
    requestReply(trimmed, historyBeforeQuestion);
  }, [appendMessage, inputText, nextId, requestReply]);

  const renderMessage = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => <MessageBubble message={item} />, []);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = rubberband(event.translationY, RUBBER_BAND_DIMENSION);
      } else {
        translateY.value = event.translationY;
      }

      const crossed = event.translationY > DISMISS_DISTANCE;
      if (crossed !== hasCrossedThreshold.value) {
        hasCrossedThreshold.value = crossed;
        if (crossed) {
          runOnJS(notifyThresholdCrossed)();
        }
      }
    })
    .onEnd((event) => {
      const shouldDismiss = event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        translateY.value = withSpring(HIDDEN_OFFSET, { ...springs.sheet, velocity: event.velocityY }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
        });
      } else {
        translateY.value = withSpring(0, { ...springs.sheet, velocity: event.velocityY });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, 1 - translateY.value / HIDDEN_OFFSET)) * 0.6,
  }));

  // Kept independent of `sheetStyle` on purpose: this only ever reserves room at the bottom of
  // the sheet's own content for the keyboard, so it can't affect whether the sheet itself opens.
  const keyboardSpacingStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));

  return (
    <Modal visible={prompt !== null} transparent animationType="none" onRequestClose={() => animateClosed()}>
      {/* Modal content lives in a separate native hierarchy — gesture-handler
          needs its own root here, the app-level one doesn't reach inside. */}
      <GestureHandlerRootView style={styles.fill}>
        <Box className="flex-1 justify-end">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => animateClosed()}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#020203' }, backdropStyle]} />
          </Pressable>

          {prompt && (
            <GestureDetector gesture={pan}>
              <Animated.View
                style={[
                  {
                    height: '78%',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    borderWidth: 1,
                    borderColor: colors.borderStrong,
                    borderBottomWidth: 0,
                    overflow: 'hidden',
                  },
                  sheetStyle,
                ]}
              >
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                <Box className="bg-white/[0.6]" style={StyleSheet.absoluteFill} />

                <Animated.View style={[{ flex: 1 }, keyboardSpacingStyle]}>
                  <Box className="px-6 pb-4 pt-3">
                    <Box className="mb-4 h-1 w-10 self-center rounded-full bg-foreground/20" />

                    <Box className="flex-row items-center">
                      <Box className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-gold/16">
                        <Ionicons name="sparkles" size={16} color={colors.gold} />
                      </Box>
                      <Text className="flex-1 font-display-semibold text-base text-foreground">AI Assistant</Text>
                      <AnimatedPressable onPress={() => animateClosed()} hitSlop={8} scaleTo={0.85}>
                        <Ionicons name="close" size={22} color={colors.textMuted} />
                      </AnimatedPressable>
                    </Box>
                  </Box>

                  <RNFlatList
                    ref={listRef}
                    className="flex-1 px-6"
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    ListFooterComponent={isTyping ? <TypingIndicator /> : null}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                  />

                  <Box className="flex-row items-end gap-2 border-t border-border px-6 pb-8 pt-3">
                    <Input className="flex-1 rounded-full border border-border bg-card px-4 py-2">
                      <InputField
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Ask about your finances…"
                        placeholderTextColor={colors.textMuted}
                        multiline
                      />
                    </Input>
                    <AnimatedPressable
                      className="h-11 w-11 items-center justify-center rounded-full bg-primary"
                      style={{ opacity: inputText.trim() ? 1 : 0.4 }}
                      onPress={handleSend}
                      disabled={!inputText.trim()}
                      scaleTo={0.85}
                      hitSlop={8}
                    >
                      <Ionicons name="arrow-up" size={20} color={colors.glass} />
                    </AnimatedPressable>
                  </Box>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          )}
        </Box>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
