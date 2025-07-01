import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/database.types';
import { useAuth } from './useAuth';

type DiagnosticSession = Database['public']['Tables']['diagnostic_sessions']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type DTCCode = Database['public']['Tables']['dtc_codes']['Row'];

export function useDiagnosticSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setSessions([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching diagnostic sessions for user:', user?.id);
      
      const { data, error } = await supabase
        .from('diagnostic_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        throw error;
      }
      
      console.log('Fetched sessions:', data?.length || 0);
      setSessions(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      console.error('Session fetch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (userId: string, issueDescription: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    try {
      console.log('Creating new diagnostic session:', { userId, issueDescription, severity });
      
      const { data, error } = await supabase
        .from('diagnostic_sessions')
        .insert({
          user_id: userId,
          issue_description: issueDescription,
          severity,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        throw error;
      }
      
      console.log('Session created successfully:', data.id);
      
      // Add initial AI welcome message with the new text
      try {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: data.id,
            type: 'ai',
            content: `Welcome! I'm your AI Mechanic.

Tell me what's going on with your car—whether it's a weird noise, warning light, or something just feels off.

To help you faster, I'll ask:
• When does it happen?
• How long has it been going on?
• Any recent repairs?

You can also snap a photo if that helps!`,
          });
        console.log('Initial AI message added to session');
      } catch (messageError) {
        console.error('Error adding initial message:', messageError);
        // Don't throw here, session creation was successful
      }

      setSessions(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Create session error:', err);
      throw err instanceof Error ? err : new Error('Failed to create session');
    }
  };

  const updateSession = async (sessionId: string, updates: Partial<DiagnosticSession>) => {
    try {
      console.log('Updating session:', sessionId, updates);
      
      const { data, error } = await supabase
        .from('diagnostic_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating session:', error);
        throw error;
      }
      
      setSessions(prev => prev.map(session => 
        session.id === sessionId ? data : session
      ));
      
      return data;
    } catch (err) {
      console.error('Update session error:', err);
      throw err instanceof Error ? err : new Error('Failed to update session');
    }
  };

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
  };
}

export function useChatMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      console.log('Setting up chat messages for session:', sessionId);
      fetchMessages();
      
      // Subscribe to new messages for this session
      const subscription = supabase
        .channel(`chat_messages_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log('New message received via subscription:', payload.new);
            const newMessage = payload.new as ChatMessage;
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              const exists = prev.some(msg => msg.id === newMessage.id);
              if (exists) {
                console.log('Message already exists, skipping');
                return prev;
              }
              console.log('Adding new message to state');
              const updatedMessages = [...prev, newMessage].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              console.log('Updated messages count:', updatedMessages.length);
              return updatedMessages;
            });
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Unsubscribing from chat messages');
        subscription.unsubscribe();
      };
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [sessionId]);

  const fetchMessages = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching messages for session:', sessionId);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
      
      console.log('Fetched messages:', data?.length || 0);
      setMessages(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      console.error('Message fetch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (content: string, type: 'user' | 'ai' | 'system', imageUrl?: string) => {
    if (!sessionId) throw new Error('No session ID');

    try {
      console.log('Adding message:', { type, content: content.substring(0, 50) + '...' });
      
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          type,
          content,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding message:', error);
        throw error;
      }
      
      console.log('Message added successfully:', data.id);
      
      // Force refresh messages to ensure we have the latest state
      await fetchMessages();
      
      return data;
    } catch (err) {
      console.error('Error adding message:', err);
      throw err instanceof Error ? err : new Error('Failed to add message');
    }
  };

  return {
    messages,
    loading,
    error,
    addMessage,
    fetchMessages,
  };
}

export function useDTCCodes(sessionId: string | null) {
  const [dtcCodes, setDtcCodes] = useState<DTCCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchDTCCodes();
    } else {
      setDtcCodes([]);
      setLoading(false);
    }
  }, [sessionId]);

  const fetchDTCCodes = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('dtc_codes')
        .select('*')
        .eq('session_id', sessionId)
        .is('cleared_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching DTC codes:', error);
        throw error;
      }
      
      setDtcCodes(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch DTC codes';
      console.error('DTC fetch error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addDTCCode = async (code: string, description: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    if (!sessionId) throw new Error('No session ID');

    try {
      const { data, error } = await supabase
        .from('dtc_codes')
        .insert({
          session_id: sessionId,
          code,
          description,
          severity,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding DTC code:', error);
        throw error;
      }
      
      setDtcCodes(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding DTC code:', err);
      throw err instanceof Error ? err : new Error('Failed to add DTC code');
    }
  };

  const clearDTCCodes = async () => {
    if (!sessionId) throw new Error('No session ID');

    try {
      const { error } = await supabase
        .from('dtc_codes')
        .update({ cleared_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .is('cleared_at', null);

      if (error) {
        console.error('Error clearing DTC codes:', error);
        throw error;
      }
      
      setDtcCodes([]);
    } catch (err) {
      console.error('Error clearing DTC codes:', err);
      throw err instanceof Error ? err : new Error('Failed to clear DTC codes');
    }
  };

  return {
    dtcCodes,
    loading,
    error,
    addDTCCode,
    clearDTCCodes,
    fetchDTCCodes,
  };
}