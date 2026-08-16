import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { FadeSlideIn } from '@/components/ui/FadeSlideIn';
import { ReceiptConfirmationModal } from '@/components/ui/ReceiptConfirmationModal';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { springs } from '@/constants/motion';
import { colors } from '@/constants/theme';
import { ParsedReceiptData, processReceiptImage } from '@/services/ocrService';
import { useTransactionStore } from '@/store/useTransactionStore';
import { Transaction } from '@/types/transaction';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceiptData | null>(null);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const flashOpacity = useSharedValue(0);

  // Only keep the camera mounted while this tab is focused, so it never
  // keeps the hardware active in the background on other tabs.
  const isFocused = useIsScreenFocused();

  const handleCapture = useCallback(async () => {
    if (!isCameraReady) {
      return;
    }
    // Fire the shutter flash the instant the button is pressed, not once
    // takePictureAsync resolves — feedback belongs on the causal event.
    flashOpacity.value = withSequence(withTiming(0.85, { duration: 40 }), withTiming(0, { duration: 220 }));

    // Quality kept modest on purpose: OCR.space's free tier caps uploads at
    // 1MB, and full-quality phone photos blow past that easily.
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
    if (photo) {
      setCapturedUri(photo.uri);
    }
  }, [flashOpacity, isCameraReady]);

  const handlePickFromLibrary = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'Photos access needed',
        'Allow access to your photos to import a receipt, or take a new one with the camera instead.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Same reasoning as the capture quality above: stay under OCR.space's
      // free-tier 1MB upload cap.
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
    }
  }, []);

  const handleRetake = useCallback(() => {
    if (isProcessing) {
      return;
    }
    setCapturedUri(null);
  }, [isProcessing]);

  const handleUsePhoto = useCallback(async () => {
    if (!capturedUri || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      const parsed = await processReceiptImage(capturedUri);
      setParsedReceipt(parsed);
    } catch {
      // Graceful fallback: OCR down, rate-limited, or the receipt was too
      // blurry to read. The confirmation sheet still opens — just with
      // blank fields instead of a pre-filled guess.
      setParsedReceipt(null);
    } finally {
      setIsProcessing(false);
      setIsConfirmVisible(true);
    }
  }, [capturedUri, isProcessing]);

  const handleConfirmReceipt = useCallback(
    (transaction: Transaction) => {
      addTransaction(transaction);
      setIsConfirmVisible(false);
      setCapturedUri(null);
      router.navigate('/');
    },
    [addTransaction, router],
  );

  const handleCancelReceipt = useCallback(() => {
    setIsConfirmVisible(false);
  }, []);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  if (!permission) {
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </Box>
    );
  }

  if (!permission.granted) {
    return <PermissionGate canAskAgain={permission.canAskAgain} onRequestPermission={requestPermission} />;
  }

  if (capturedUri) {
    return (
      <>
        <PreviewView uri={capturedUri} isProcessing={isProcessing} onRetake={handleRetake} onUsePhoto={handleUsePhoto} />
        <ReceiptConfirmationModal
          visible={isConfirmVisible}
          initialData={parsedReceipt}
          onCancel={handleCancelReceipt}
          onConfirm={handleConfirmReceipt}
        />
      </>
    );
  }

  return (
    <Box className="flex-1 bg-background">
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
        />
      )}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />

      <SafeAreaView className="flex-1 justify-between" edges={['top', 'bottom']}>
        <Box className="flex-row items-center justify-between px-6 pt-2">
          <Text
            className="overflow-hidden rounded-full border border-border bg-glass/[0.06] px-3 py-1.5 font-body-semibold text-[13px] text-glass"
          >
            Align the receipt within the frame
          </Text>
          <AnimatedPressable
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-glass/[0.06]"
            onPress={toggleFacing}
            hitSlop={8}
            scaleTo={0.85}
          >
            <Ionicons name="camera-reverse-outline" size={22} color={colors.glass} />
          </AnimatedPressable>
        </Box>

        <Box className="flex-row items-center justify-between px-10 pb-6">
          <AnimatedPressable
            className="h-14 w-14 items-center justify-center rounded-full border border-glass/40 bg-glass/[0.06]"
            onPress={handlePickFromLibrary}
            hitSlop={8}
            scaleTo={0.85}
          >
            <Ionicons name="images-outline" size={24} color={colors.glass} />
          </AnimatedPressable>

          <AnimatedPressable
            className={`h-[76px] w-[76px] items-center justify-center rounded-[38px] border-4 border-glass/90 ${!isCameraReady ? 'opacity-40' : ''}`}
            style={{ shadowColor: colors.primary, shadowRadius: 20, shadowOpacity: 0.8, shadowOffset: { width: 0, height: 0 } }}
            onPress={handleCapture}
            disabled={!isCameraReady}
            scaleTo={0.88}
          >
            <Box className="h-[60px] w-[60px] rounded-[30px] bg-glass" />
          </AnimatedPressable>

          {/* Balances the upload button's width so the shutter stays visually centered. */}
          <Box className="h-14 w-14" />
        </Box>
      </SafeAreaView>
    </Box>
  );
}

interface PreviewViewProps {
  uri: string;
  isProcessing: boolean;
  onRetake: () => void;
  onUsePhoto: () => void;
}

function PreviewView({ uri, isProcessing, onRetake, onUsePhoto }: PreviewViewProps) {
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withSpring(1, springs.default);
  }, [reveal]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 1.04 - reveal.value * 0.04 }],
  }));

  return (
    <Box className="flex-1 bg-background">
      <Animated.View style={[StyleSheet.absoluteFill, revealStyle]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Animated.View>

      {isProcessing && (
        <FadeSlideIn
          className="items-center justify-center gap-4 bg-black/[0.72]"
          style={StyleSheet.absoluteFill}
          distance={0}
        >
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="font-body-semibold text-[15px] text-glass">Reading your receipt...</Text>
        </FadeSlideIn>
      )}

      <SafeAreaView
        className="flex-row gap-4 px-6 pt-4"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        edges={['bottom']}
      >
        <AnimatedPressable
          className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg border border-border bg-glass/[0.14] py-3.5 ${isProcessing ? 'opacity-50' : ''}`}
          onPress={onRetake}
          disabled={isProcessing}
        >
          <Ionicons name="refresh" size={18} color={colors.glass} />
          <Text className="font-body-semibold text-[15px] text-glass">Retake</Text>
        </AnimatedPressable>
        <AnimatedPressable
          className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-primary py-3.5 ${isProcessing ? 'opacity-50' : ''}`}
          style={{ shadowColor: '#000000', shadowRadius: 10, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 } }}
          onPress={onUsePhoto}
          disabled={isProcessing}
        >
          <Ionicons name="checkmark" size={18} color={colors.glass} />
          <Text className="font-body-semibold text-[15px] text-glass">Use Photo</Text>
        </AnimatedPressable>
      </SafeAreaView>
    </Box>
  );
}

function useIsScreenFocused() {
  const [isFocused, setIsFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  return isFocused;
}

interface PermissionGateProps {
  canAskAgain: boolean;
  onRequestPermission: () => void;
}

function PermissionGate({ canAskAgain, onRequestPermission }: PermissionGateProps) {
  return (
    <Box className="flex-1 items-center justify-center bg-background px-8">
      <FadeSlideIn className="items-center">
        <Box className="mb-6 h-[72px] w-[72px] items-center justify-center rounded-full bg-primary/16">
          <Ionicons name="camera-outline" size={32} color={colors.primary} />
        </Box>
        <Text className="font-display-semibold text-[21px] text-foreground">Camera access needed</Text>
        <Text className="mt-2 text-center font-body text-sm leading-5 text-muted-foreground">
          We use your camera to photograph receipts so we can track your spending automatically.
        </Text>
        <AnimatedPressable
          className="mt-6 rounded-lg bg-primary px-8 py-3.5"
          style={{ shadowColor: colors.primary, shadowRadius: 12, shadowOpacity: 0.22, shadowOffset: { width: 0, height: 4 } }}
          onPress={canAskAgain ? onRequestPermission : () => Linking.openSettings()}
        >
          <Text className="font-body-semibold text-[15px] text-glass">{canAskAgain ? 'Grant Permission' : 'Open Settings'}</Text>
        </AnimatedPressable>
      </FadeSlideIn>
    </Box>
  );
}
