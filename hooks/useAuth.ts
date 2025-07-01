import { useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    console.log('Initializing auth for platform:', Platform.OS);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      
      if (mounted.current) {
        console.log('Initial session:', session ? 'Found' : 'None');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Failed to get initial session:', error);
      if (mounted.current) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session ? 'Session exists' : 'No session');
      
      if (mounted.current) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
      } else {
        console.log('Sign in successful');
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { data: null, error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('Attempting sign up for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
      } else {
        console.log('Sign up successful');
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign up exception:', error);
      return { data: null, error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting sign out');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Sign out successful');
      }
      
      return { error };
    } catch (error) {
      console.error('Sign out exception:', error);
      return { error: error as Error };
    }
  };

  return {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}