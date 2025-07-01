import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Volume2, VolumeX, Square, Loader, Wrench } from 'lucide-react-native';

interface VoiceResponseModalProps {
  visible: boolean;
  onStop: () => void;
  onMute: () => void;
  onUnmute: () => void;
  isMuted: boolean;
  isProcessing: boolean;
  responseText: string;
}

export default function VoiceResponseModal({
  visible,
  onStop,
  onMute,
  onUnmute,
  isMuted,
  isProcessing,
  responseText,
}: VoiceResponseModalProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulse animation for speaking indicator
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim, pulseAnim]);

  const handleMuteToggle = () => {
    if (isMuted) {
      onUnmute();
    } else {
      onMute();
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <View style={styles.iconContainer}>
                <Wrench size={20} color="#000000" />
              </View>
              <Text style={styles.headerTitle}>AI Voice Response</Text>
            </View>
            <View style={styles.statusContainer}>
              {isProcessing ? (
                <View style={styles.processingIndicator}>
                  <Loader size={16} color="#F6AD55" />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.speakingIndicator}>
                  <Animated.View
                    style={[
                      styles.speakingDot,
                      {
                        transform: [{ scale: isMuted ? 1 : pulseAnim }],
                        backgroundColor: isMuted ? '#A0AEC0' : '#68D391',
                      },
                    ]}
                  />
                  <Text style={[styles.speakingText, { color: isMuted ? '#A0AEC0' : '#68D391' }]}>
                    {isMuted ? 'Muted' : 'Speaking'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Response Preview */}
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>AI Response:</Text>
            <Text style={styles.responseText}>
              {truncateText(responseText)}
            </Text>
          </View>

          {/* Visual Waveform Indicator */}
          <View style={styles.waveformContainer}>
            {[...Array(5)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: isMuted ? 4 : undefined,
                    backgroundColor: isMuted ? '#A0AEC0' : '#A7C5BD',
                    transform: isMuted
                      ? []
                      : [
                          {
                            scaleY: pulseAnim.interpolate({
                              inputRange: [1, 1.2],
                              outputRange: [0.3 + index * 0.2, 1 + index * 0.3],
                            }),
                          },
                        ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: isMuted ? '#A0AEC0' : '#F6AD55' }]}
              onPress={handleMuteToggle}
            >
              {isMuted ? (
                <VolumeX size={24} color="#FFFFFF" />
              ) : (
                <Volume2 size={24} color="#FFFFFF" />
              )}
              <Text style={styles.controlButtonText}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: '#F56565' }]}
              onPress={onStop}
            >
              <Square size={24} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            {isMuted
              ? 'Voice is muted but response continues in chat'
              : 'AI is speaking the response aloud'}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  statusContainer: {
    alignItems: 'center',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    color: '#F6AD55',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speakingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  speakingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  responseContainer: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  responseText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  waveformContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    marginBottom: 24,
  },
  waveformBar: {
    width: 4,
    height: 20,
    backgroundColor: '#A7C5BD',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 16,
  },
});