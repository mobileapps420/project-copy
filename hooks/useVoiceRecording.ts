import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';

interface UseVoiceRecordingProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
}

export function useVoiceRecording({ onTranscriptionComplete, onError }: UseVoiceRecordingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const speechRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        onError('Audio recording permission is required to use voice features');
        return false;
      }
      return true;
    } catch (error) {
      onError('Failed to request audio permissions');
      return false;
    }
  };

  const startRecording = async () => {
    try {
      // Check if we're on web platform
      if (Platform.OS === 'web') {
        // For web, use speech recognition API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          startWebSpeechRecognition();
        } else {
          onError('Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
        }
        return;
      }

      // For mobile platforms, request permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Start recording with high quality settings
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      recordingRef.current = recording;
      setIsRecording(true);
      console.log('🎤 Started recording on mobile device');
    } catch (error) {
      console.error('Recording start error:', error);
      onError('Failed to start recording: ' + (error as Error).message);
    }
  };

  const stopRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsRecording(false);
        return;
      }

      if (!recordingRef.current) return;

      setIsRecording(false);
      setIsProcessing(true);

      console.log('🎤 Stopping recording...');
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        console.log('🎤 Recording saved to:', uri);
        // Process the audio file for speech-to-text
        await processAudioForSpeechToText(uri);
      } else {
        setIsProcessing(false);
        onError('Failed to save recording');
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('Recording stop error:', error);
      onError('Failed to stop recording: ' + (error as Error).message);
    }
  };

  const startWebSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        console.log('🎤 Web speech recognition started');
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Web speech recognition result:', transcript);
        setIsRecording(false);
        onTranscriptionComplete(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('🎤 Web speech recognition error:', event.error);
        setIsRecording(false);
        
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        onError(errorMessage);
      };

      recognition.onend = () => {
        console.log('🎤 Web speech recognition ended');
        setIsRecording(false);
      };

      recognition.start();
    } catch (error) {
      setIsRecording(false);
      console.error('🎤 Web speech recognition setup error:', error);
      onError('Speech recognition not supported in this browser');
    }
  };

  const processAudioForSpeechToText = async (audioUri: string) => {
    try {
      console.log('🎤 Processing audio for speech-to-text...');
      setIsProcessing(true);
      
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For web platform, convert to blob
        const response = await fetch(audioUri);
        const audioBlob = await response.blob();
        
        // Determine the correct file extension and MIME type for web
        let fileExtension = '.webm';
        let mimeType = 'audio/webm';
        
        if (audioBlob.type.includes('webm')) {
          fileExtension = '.webm';
          mimeType = 'audio/webm';
        } else if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) {
          fileExtension = '.m4a';
          mimeType = 'audio/m4a';
        } else if (audioBlob.type.includes('wav')) {
          fileExtension = '.wav';
          mimeType = 'audio/wav';
        } else if (audioBlob.type.includes('ogg')) {
          fileExtension = '.ogg';
          mimeType = 'audio/ogg';
        }
        
        // Create a new blob with the correct MIME type if needed
        const finalBlob = audioBlob.type ? audioBlob : new Blob([audioBlob], { type: mimeType });
        
        console.log('🎤 Web audio blob type:', finalBlob.type, 'size:', finalBlob.size);
        formData.append('file', finalBlob, `audio${fileExtension}`);
      } else {
        // For mobile platforms (React Native), use the file object format
        // This is the correct way to handle local file URIs in React Native
        const fileObject = {
          uri: audioUri,
          name: 'audio.m4a',
          type: 'audio/m4a'
        } as any;
        
        console.log('🎤 Mobile audio file:', fileObject);
        formData.append('file', fileObject);
      }
      
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('prompt', 'This is a voice message about automotive issues, car problems, vehicle diagnostics, or mechanical concerns.');

      console.log('🎤 Sending audio to OpenAI Whisper...');

      // Use OpenAI Whisper API for speech-to-text
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('🎤 OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      }

      const transcriptionData = await openaiResponse.json();
      const transcription = transcriptionData.text?.trim();

      if (!transcription) {
        throw new Error('No transcription received from OpenAI');
      }

      console.log('🎤 OpenAI Whisper transcription result:', transcription);
      setIsProcessing(false);
      onTranscriptionComplete(transcription);
      
    } catch (error) {
      setIsProcessing(false);
      console.error('🎤 Speech-to-text processing error:', error);
      
      // Fallback to a more helpful error message
      if (error instanceof Error && error.message.includes('OpenAI API')) {
        onError('Speech-to-text service is temporarily unavailable. Please type your message instead.');
      } else {
        onError('Failed to process speech. Please try typing your message or check your microphone.');
      }
    }
  };

  const speakText = async (text: string) => {
    try {
      // Stop any current speech
      await stopSpeaking();
      
      setCurrentSpeechText(text);
      setIsSpeaking(true);
      setIsMuted(false);

      if (Platform.OS === 'web') {
        // Use Web Speech API for text-to-speech on web
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          
          utterance.onend = () => {
            setIsSpeaking(false);
            setCurrentSpeechText('');
          };
          
          utterance.onerror = () => {
            setIsSpeaking(false);
            setCurrentSpeechText('');
          };
          
          speechRef.current = utterance;
          speechSynthesis.speak(utterance);
        }
      } else {
        // Use expo-speech for mobile platforms
        await Speech.speak(text, {
          language: 'en-US',
          pitch: 1,
          rate: 0.9,
          onDone: () => {
            setIsSpeaking(false);
            setCurrentSpeechText('');
          },
          onError: () => {
            setIsSpeaking(false);
            setCurrentSpeechText('');
          },
        });
      }
    } catch (error) {
      console.warn('Text-to-speech failed:', error);
      setIsSpeaking(false);
      setCurrentSpeechText('');
    }
  };

  const stopSpeaking = async () => {
    try {
      if (Platform.OS === 'web') {
        if ('speechSynthesis' in window) {
          speechSynthesis.cancel();
        }
      } else {
        await Speech.stop();
      }
      setIsSpeaking(false);
      setCurrentSpeechText('');
      setIsMuted(false);
    } catch (error) {
      console.warn('Failed to stop speech:', error);
    }
  };

  const muteSpeech = () => {
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) {
        speechSynthesis.pause();
      }
    } else {
      // For mobile, we'll stop the speech entirely as pause isn't available
      Speech.stop();
      setIsSpeaking(false);
    }
    setIsMuted(true);
  };

  const unmuteSpeech = () => {
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window && speechSynthesis.paused) {
        speechSynthesis.resume();
      } else if (currentSpeechText) {
        // Restart speech if it was stopped
        speakText(currentSpeechText);
      }
    } else {
      // For mobile, restart the speech
      if (currentSpeechText) {
        speakText(currentSpeechText);
      }
    }
    setIsMuted(false);
  };

  return {
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
    unmuteSpeech,
  };
}