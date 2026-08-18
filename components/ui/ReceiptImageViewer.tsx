import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { getReceiptImageUrl } from '@/services/storageService';
import { haptics } from '@/utils/haptics';
import { shareReceiptImage } from '@/utils/receiptExport';

const FADE_DURATION_MS = 250;

type LoadState = 'loading' | 'ready' | 'error';

interface ReceiptImageViewerProps {
  visible: boolean;
  /** Supabase Storage object path (Transaction.imagePath) — exchanged for a signed URL on open. */
  imagePath: string;
  onClose: () => void;
}

/**
 * Full-screen receipt viewer: fades in over a black backdrop (same fade-unmount recipe as
 * BiometricLock), fetches a short-lived signed URL for the private "receipts" bucket object, and
 * offers a share/export action that hands the image to the native share sheet.
 */
export function ReceiptImageViewer({ visible, imagePath, onClose }: ReceiptImageViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isSharing, setIsSharing] = useState(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    opacity.value = withTiming(1, { duration: FADE_DURATION_MS });
    setLoadState('loading');
    setSignedUrl(null);

    let cancelled = false;
    getReceiptImageUrl(imagePath)
      .then((url) => {
        if (!cancelled) {
          setSignedUrl(url);
          setLoadState('ready');
        }
      })
      .catch((error) => {
        console.warn('[ReceiptImageViewer] Failed to load receipt image:', error);
        if (!cancelled) {
          setLoadState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, imagePath, opacity]);

  const handleClose = useCallback(() => {
    opacity.value = withTiming(0, { duration: FADE_DURATION_MS }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose, opacity]);

  const handleShare = async () => {
    if (!signedUrl || isSharing) {
      return;
    }
    setIsSharing(true);
    try {
      await shareReceiptImage(signedUrl);
    } catch (error) {
      console.warn('[ReceiptImageViewer] Share failed:', error);
      haptics.error();
      Alert.alert('Share failed', "We couldn't prepare this receipt for sharing. Try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, containerStyle]}>
        <Box className="flex-1 items-center justify-center">
          {loadState === 'loading' && <ActivityIndicator size="large" color={colors.glass} />}

          {loadState === 'error' && (
            <Box className="items-center gap-2 px-8">
              <Ionicons name="alert-circle-outline" size={32} color={colors.glass} />
              <Text className="text-center font-body-medium text-sm text-glass/80">We couldn&apos;t load this receipt image.</Text>
            </Box>
          )}

          {loadState === 'ready' && signedUrl && (
            <Image source={{ uri: signedUrl }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
          )}
        </Box>

        {/* Receipts are almost always white paper — a translucent-white button would vanish on
            top of one, so the controls get their own dark scrim regardless of what's underneath. */}
        <LinearGradient
          colors={['rgba(2,2,3,0.75)', 'rgba(2,2,3,0)']}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 160 }}
        />

        <Box className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 pt-14">
          <AnimatedPressable
            className="h-10 w-10 items-center justify-center rounded-full border border-glass/10"
            style={{ backgroundColor: 'rgba(2,2,3,0.55)' }}
            onPress={handleClose}
            scaleTo={0.85}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={colors.glass} />
          </AnimatedPressable>

          <AnimatedPressable
            className={`flex-row items-center gap-1.5 rounded-full border border-glass/10 px-4 py-2.5 ${
              isSharing || loadState !== 'ready' ? 'opacity-50' : ''
            }`}
            style={{ backgroundColor: 'rgba(2,2,3,0.55)' }}
            onPress={handleShare}
            disabled={isSharing || loadState !== 'ready'}
            scaleTo={0.9}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.glass} />
            ) : (
              <Ionicons name="share-outline" size={17} color={colors.glass} />
            )}
            <Text className="font-body-semibold text-[13px] text-glass">{isSharing ? 'Preparing…' : 'Share'}</Text>
          </AnimatedPressable>
        </Box>
      </Animated.View>
    </Modal>
  );
}
