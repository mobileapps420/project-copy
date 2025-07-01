import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Mic, MicOff, Send, Image as ImageIcon, Volume2, Loader, Eye, Wrench } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useDiagnosticSessions, useChatMessages } from '@/hooks/useDiagnosticSessions';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAIDiagnostic } from '@/hooks/useAIDiagnostic';
import VoiceResponseModal from '@/components/VoiceResponseModal';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  created_at: string;
  image_url?: string;
}

export default function DiagnosticScreen() {
  const { user } = useAuth();
  const { sessions, createSession } = useDiagnosticSessions();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { messages, addMessage, loading: messagesLoading, fetchMessages } = useChatMessages(currentSessionId);
  const [inputText, setInputText] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraView>(null);

  const { 
    isRecording, 
    isProcessing, 
    isSpeaking, 
    isMuted, 
    currentSpeechText,
    startRecording, 
    stopRecording, 
    speakText,
    stopSpeaking,
    muteSpeech,
    unmuteSpeech
  } = useVoiceRecording({
    onTranscriptionComplete: (text: string) => {
      if (currentSessionId) {
        handleVoiceMessage(text);
      }
    },
    onError: (error: string) => {
      Alert.alert('Voice Recording Error', error);
    },
  });

  const { sendMessageToAI, isProcessing: aiProcessing } = useAIDiagnostic({
    sessionId: currentSessionId,
    onAIResponse: (response: string) => {
      console.log('AI response received for TTS:', response.substring(0, 50) + '...');
      speakText(response);
    },
    onError: (error: string) => {
      console.error('AI Error:', error);
      Alert.alert('AI Error', error);
    },
  });

  // Keyboard event listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Auto-create a session if none exists
  useEffect(() => {
    if (user && sessions.length === 0 && !currentSessionId) {
      console.log('Creating default session for user:', user.id);
      createSession(user.id, 'General automotive diagnostic assistance').then((session) => {
        console.log('Default session created:', session.id);
        setCurrentSessionId(session.id);
      }).catch((error) => {
        console.error('Failed to create session:', error);
      });
    } else if (sessions.length > 0 && !currentSessionId) {
      console.log('Using existing session:', sessions[0].id);
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId, user, createSession]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const triggerHapticFeedback = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const buildConversationHistory = () => {
    return messages.slice(-10).map(msg => ({
      role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content.replace(/^🎤\s/, '').replace(/^📷\s/, '') // Remove emoji prefixes
    }));
  };

  const handleSendMessage = async () => {
    if (inputText.trim() && currentSessionId) {
      const messageText = inputText.trim();
      setInputText('');
      
      try {
        console.log('Sending text message:', messageText);
        
        await addMessage(messageText, 'user');
        
        const conversationHistory = buildConversationHistory();
        await sendMessageToAI(messageText, 'user', undefined, conversationHistory);
        
        setTimeout(() => {
          fetchMessages();
        }, 1000);
        
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
        setInputText(messageText);
      }
    }
  };

  const handleVoiceMessage = async (transcribedText: string) => {
    if (!currentSessionId) return;
    
    try {
      console.log('Sending voice message:', transcribedText);
      
      await addMessage(`🎤 ${transcribedText}`, 'user');
      
      const conversationHistory = buildConversationHistory();
      await sendMessageToAI(transcribedText, 'user', undefined, conversationHistory);
      
      setTimeout(() => {
        fetchMessages();
      }, 1000);
      
    } catch (error) {
      console.error('Error processing voice message:', error);
      Alert.alert('Error', 'Failed to process voice message');
    }
  };

  const toggleVoiceRecording = () => {
    triggerHapticFeedback();
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleStopVoiceResponse = () => {
    stopSpeaking();
  };

  const handleMuteVoiceResponse = () => {
    muteSpeech();
  };

  const handleUnmuteVoiceResponse = () => {
    unmuteSpeech();
  };

  // Convert image to base64 data URL for AI analysis
  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      console.log('📤 Converting image to base64 for AI analysis...');
      
      if (Platform.OS === 'web') {
        // For web, convert blob to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            console.log('✅ Web image converted to base64, size:', Math.round(base64.length / 1024), 'KB');
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // For mobile, use expo-file-system to convert to base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        console.log('✅ Mobile image converted to base64, size:', Math.round(dataUrl.length / 1024), 'KB');
        return dataUrl;
      }
    } catch (error) {
      console.error('❌ Base64 conversion failed:', error);
      throw new Error('Failed to process image for AI analysis');
    }
  };

  const openImagePicker = async () => {
    try {
      triggerHapticFeedback();
      
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to select diagnostic images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📷 Image selected from library:', imageUri);
        await processSelectedImage(imageUri);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to capture diagnostic images.');
        return;
      }
    }
    triggerHapticFeedback();
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready. Please try again.');
      return;
    }

    try {
      triggerHapticFeedback();
      setUploadingImage(true);
      
      console.log('📷 Taking picture with camera...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      
      if (photo?.uri) {
        console.log('✅ Photo captured:', photo.uri);
        setShowCamera(false);
        await processSelectedImage(photo.uri);
      } else {
        throw new Error('Failed to capture photo');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const processSelectedImage = async (imageUri: string) => {
    if (!currentSessionId) return;
    
    try {
      setUploadingImage(true);
      console.log('🖼️ Processing real automotive diagnostic image:', imageUri);
      
      // Convert image to base64 for AI analysis
      const base64ImageUrl = await convertImageToBase64(imageUri);
      
      // Enhanced user message with comprehensive diagnostic context
      const diagnosticMessage = '📷 Real automotive diagnostic image captured for AI visual analysis. Please examine all visible components, systems, fluids, wear patterns, and potential issues. Provide detailed technical assessment with safety recommendations and repair guidance.';
      
      // Save message with the local image URI for display
      await addMessage(diagnosticMessage, 'user', imageUri);
      
      // Enhanced AI prompt for comprehensive image analysis
      const conversationHistory = buildConversationHistory();
      const imageAnalysisPrompt = `I have captured a real automotive diagnostic image for professional analysis. Please perform a comprehensive visual inspection:

🔍 VISUAL INSPECTION:
• Identify all visible automotive systems and components
• Assess condition of each visible part (wear, damage, corrosion)
• Look for fluid leaks, stains, or unusual discoloration
• Check for proper installation and component alignment
• Note any missing, loose, or damaged parts

🚨 SAFETY ASSESSMENT:
• Identify any immediate safety concerns
• Evaluate drive-ability and operational safety
• Assess severity of any identified issues
• Determine repair urgency and priority

🛠️ RECOMMENDATIONS:
• Provide specific repair recommendations
• Suggest diagnostic tests or inspections needed
• Advise on DIY vs. professional service requirements
• Estimate repair complexity and cost considerations

This is a real automotive diagnostic image requiring expert visual analysis. Please provide detailed, specific observations based on what you can see.`;

      // Send the base64 image URL to AI for analysis
      await sendMessageToAI(
        imageAnalysisPrompt,
        'user', 
        base64ImageUrl, // Use base64 for AI analysis
        conversationHistory
      );
      
      setTimeout(() => {
        fetchMessages();
      }, 1500);
      
    } catch (error) {
      console.error('Error processing diagnostic image:', error);
      Alert.alert('Error', 'Failed to process diagnostic image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isUser ? styles.userMessage : isSystem ? styles.systemMessage : styles.aiMessage
      ]}>
        {message.image_url && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: message.image_url }} 
              style={styles.diagnosticImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('Image loading error:', error.nativeEvent?.error || 'Unknown error');
              }}
              onLoad={() => {
                console.log('Diagnostic image loaded successfully');
              }}
            />
            <View style={styles.imageLabel}>
              <Eye size={14} color="#000000" />
              <Text style={styles.imageText}>
                Diagnostic Image
              </Text>
            </View>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isUser ? styles.userMessageText : isSystem ? styles.systemMessageText : styles.aiMessageText
        ]}>
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {!isUser && (
            <TouchableOpacity
              style={styles.speakButton}
              onPress={() => speakText(message.content)}
            >
              <Volume2 size={12} color="#000000" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (showCamera) {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.cameraCloseButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraCloseText}>Close</Text>
            </TouchableOpacity>
            
            <View style={styles.cameraInstructions}>
              <Text style={styles.instructionText}>Point camera at the issue</Text>
              <Text style={styles.instructionSubtext}>AI will analyze your photo</Text>
            </View>
            
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={() => {
                  setShowCamera(false);
                  openImagePicker();
                }}
              >
                <ImageIcon size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.cameraCaptureButton, uploadingImage && styles.disabledButton]}
                onPress={takePicture}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader size={30} color="#FFFFFF" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>
              
              <View style={styles.placeholderButton} />
            </View>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Wrench size={20} color="#000000" />
            </View>
            <Text style={styles.headerTitle}>AI Mechanic</Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { 
              backgroundColor: aiProcessing || uploadingImage ? '#F6AD55' : '#68D391' 
            }]} />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: keyboardHeight > 0 ? 10 : (Platform.OS === 'ios' ? 160 : 140) }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messagesLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Loader size={24} color="#000000" />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIcon}>
                <Wrench size={48} color="#000000" />
              </View>
              <Text style={styles.welcomeTitle}>Diagnose your car in 1 minute</Text>
              <Text style={styles.welcomeSubtitle}>
                Describe the issue or take a photo for instant AI analysis
              </Text>
              
              <View style={styles.featureGrid}>
                <View style={styles.featureCard}>
                  <Mic size={20} color="#000000" />
                  <Text style={styles.featureText}>Voice</Text>
                </View>
                <View style={styles.featureCard}>
                  <Camera size={20} color="#000000" />
                  <Text style={styles.featureText}>Photo</Text>
                </View>
                <View style={styles.featureCard}>
                  <Eye size={20} color="#000000" />
                  <Text style={styles.featureText}>AI Vision</Text>
                </View>
              </View>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
          
          {(isProcessing || aiProcessing || uploadingImage) && (
            <View style={styles.processingContainer}>
              <Loader size={16} color="#000000" />
              <Text style={styles.processingText}>
                {uploadingImage ? 'Processing image...' : 
                 isProcessing ? 'Converting voice...' : 
                 'AI analyzing...'}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[
          styles.inputContainer,
          keyboardHeight > 0 && {
            bottom: keyboardHeight + (Platform.OS === 'ios' ? 5 : 10), // Reduced from 10/20 to 5/10
          }
        ]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Describe your car issue..."
              placeholderTextColor="#A0AEC0"
              multiline
              maxLength={500}
              editable={!isRecording && !aiProcessing && !uploadingImage}
            />
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isRecording && styles.recordingButton,
                  isProcessing && styles.processingButton
                ]}
                onPress={toggleVoiceRecording}
                disabled={isProcessing || aiProcessing || uploadingImage}
              >
                {isProcessing ? (
                  <Loader size={24} color="#FFFFFF" />
                ) : isRecording ? (
                  <MicOff size={24} color="#FFFFFF" />
                ) : (
                  <Mic size={24} color="#000000" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, (isRecording || aiProcessing || uploadingImage) && styles.disabledButton]}
                onPress={openCamera}
                disabled={isRecording || isProcessing || aiProcessing || uploadingImage}
              >
                {uploadingImage ? (
                  <Loader size={24} color="#FFFFFF" />
                ) : (
                  <Camera size={24} color="#000000" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isRecording || aiProcessing || uploadingImage) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isRecording || aiProcessing || uploadingImage}
              >
                <Send size={24} color={inputText.trim() && !isRecording && !aiProcessing && !uploadingImage ? '#FFFFFF' : '#A0AEC0'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Voice Response Modal */}
      <VoiceResponseModal
        visible={isSpeaking}
        onStop={handleStopVoiceResponse}
        onMute={handleMuteVoiceResponse}
        onUnmute={handleUnmuteVoiceResponse}
        isMuted={isMuted}
        isProcessing={aiProcessing}
        responseText={currentSpeechText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#000000',
    fontSize: 16,
    marginLeft: 8,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featureGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  featureCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
  },
  featureText: {
    fontSize: 12,
    color: '#000000',
    marginTop: 8,
    fontWeight: '500',
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#A7C5BD',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    padding: 16,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 12,
    maxWidth: '70%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#000000',
  },
  aiMessageText: {
    color: '#000000',
  },
  systemMessageText: {
    color: '#000000',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: '#000000',
  },
  speakButton: {
    padding: 4,
    borderRadius: 8,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  diagnosticImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  imageText: {
    color: '#000000',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  processingText: {
    color: '#000000',
    fontSize: 14,
    marginLeft: 8,
  },
  inputContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 60,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
  },
  textInput: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
    maxHeight: 100,
    minHeight: 20,
    marginRight: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recordingButton: {
    backgroundColor: '#F56565',
    borderColor: '#F56565',
  },
  processingButton: {
    backgroundColor: '#F6AD55',
    borderColor: '#F6AD55',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  cameraCloseButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  cameraInstructions: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 60,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionSubtext: {
    color: '#E2E8F0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 50,
  },
  imagePickerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A7C5BD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  placeholderButton: {
    width: 60,
    height: 60,
  },
});