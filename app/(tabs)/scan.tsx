import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/constants/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Only keep the camera mounted while this tab is focused, so it never
  // keeps the hardware active in the background on other tabs.
  const isFocused = useIsScreenFocused();

  const handleCapture = useCallback(async () => {
    if (!isCameraReady) {
      return;
    }
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo) {
      setCapturedUri(photo.uri);
    }
  }, [isCameraReady]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
  }, []);

  const handleUsePhoto = useCallback(() => {
    console.log('Captured receipt URI:', capturedUri);
    setCapturedUri(null);
  }, [capturedUri]);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionGate
        canAskAgain={permission.canAskAgain}
        onRequestPermission={requestPermission}
      />
    );
  }

  if (capturedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <SafeAreaView style={styles.previewActions} edges={['bottom']}>
          <Pressable style={[styles.actionButton, styles.retakeButton]} onPress={handleRetake}>
            <Ionicons name="refresh" size={18} color={colors.textPrimary} />
            <Text style={styles.retakeLabel}>Retake</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.useButton]} onPress={handleUsePhoto}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.useLabel}>Use Photo</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
        />
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Text style={styles.hint}>Align the receipt within the frame</Text>
          <Pressable style={styles.flipButton} onPress={toggleFacing} hitSlop={8}>
            <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.captureButton, !isCameraReady && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={!isCameraReady}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
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
    <View style={styles.permissionContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name="camera-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.permissionTitle}>Camera access needed</Text>
      <Text style={styles.permissionSubtitle}>
        We use your camera to photograph receipts so we can track your spending automatically.
      </Text>
      <Pressable
        style={styles.grantButton}
        onPress={canAskAgain ? onRequestPermission : () => Linking.openSettings()}
      >
        <Text style={styles.grantButtonLabel}>{canAskAgain ? 'Grant Permission' : 'Open Settings'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.4,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  retakeButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  retakeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  useButton: {
    backgroundColor: colors.primary,
  },
  useLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  grantButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  grantButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
