import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UseAIDiagnosticProps {
  sessionId: string | null;
  onAIResponse?: (response: string) => void;
  onError?: (error: string) => void;
}

export function useAIDiagnostic({ sessionId, onAIResponse, onError }: UseAIDiagnosticProps) {
  const { session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessageToAI = async (
    message: string, 
    messageType: 'user' | 'ai' | 'system' = 'user',
    imageUrl?: string,
    conversationHistory?: ConversationMessage[]
  ) => {
    if (!sessionId || !session?.access_token) {
      onError?.('No active session or authentication');
      return null;
    }

    setIsProcessing(true);

    try {
      console.log('Sending message to AI:', { sessionId, messageType, messageLength: message.length });

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-diagnostic`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            message,
            messageType,
            imageUrl,
            conversationHistory,
          }),
        }
      );

      console.log('AI response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('AI response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      // The AI response is automatically saved to the database by the edge function
      // We just need to trigger the callback for text-to-speech
      if (data.aiResponse) {
        console.log('Triggering AI response callback');
        onAIResponse?.(data.aiResponse);
      }

      return data.message;

    } catch (error) {
      console.error('AI Diagnostic Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sendMessageToAI,
    isProcessing,
  };
}