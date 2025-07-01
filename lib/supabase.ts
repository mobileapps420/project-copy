import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { Platform } from 'react-native';

// Environment variable validation with better error messages
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable');
  throw new Error('Supabase URL is required. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL is set.');
}

if (!supabaseAnonKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
  throw new Error('Supabase Anon Key is required. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_ANON_KEY is set.');
}

// Platform-specific configuration
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    storage: Platform.OS !== 'web' ? undefined : window.localStorage,
  },
  global: {
    headers: {
      'X-Client-Info': `cardiag-ai-pro/${Platform.OS}`,
    },
  },
};

console.log('Initializing Supabase client for platform:', Platform.OS);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, supabaseConfig);

// Test connection on initialization
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase client initialized successfully');
  }
}).catch((error) => {
  console.error('Failed to test Supabase connection:', error);
});