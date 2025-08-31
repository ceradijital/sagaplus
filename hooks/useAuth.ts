import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setSession(session);
      setLoading(false);
    } else {
      // Check for saved credentials and auto-login
      try {
        const shouldRemember = await AsyncStorage.getItem('remember_me');
        const savedEmail = await AsyncStorage.getItem('saved_email');
        const savedPassword = await AsyncStorage.getItem('saved_password');
        
        if (shouldRemember === 'true' && savedEmail && savedPassword) {
          const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: savedEmail,
            password: savedPassword,
          });
          
          if (error) {
            // Clear invalid saved credentials
            await AsyncStorage.removeItem('saved_email');
            await AsyncStorage.removeItem('saved_password');  
            await AsyncStorage.removeItem('remember_me');
          }
        }
      } catch (error) {
        console.error('Auto-login error:', error);
      } finally {
        setLoading(false);
      }
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  };

  return { session, loading };
}