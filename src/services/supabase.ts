import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
    require('react-native-url-polyfill/auto');
}
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://elpbamjdmljaaxzjcatx.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Helper function to get current user
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
};

// Helper function to sign out - robust: always clears local session even if server call fails
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
            console.warn('Global sign out failed, forcing local sign out:', error.message);
            await supabase.auth.signOut({ scope: 'local' });
        }
    } catch (e) {
        console.warn('Sign out error, forcing local sign out:', e);
        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch (localErr) {
            console.error('Even local sign out failed:', localErr);
        }
    }
};
