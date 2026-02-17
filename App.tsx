import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabase } from './src/services/supabase';
import { Colors } from './src/constants/theme';

import './src/locales/i18n';

import {
  AuthNavigator,
  EmployeeNavigator,
  StoreOwnerNavigator,
  HRNavigator,
  SuperAdminNavigator,
  ForceChangePasswordNavigator,
} from './src/navigation';

import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';

const queryClient = new QueryClient();

function Main() {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Refs to prevent race conditions and concurrent loads
  const isLoadingProfile = useRef(false);
  const safetyTimeoutRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  const inferRoleFromEmail = (email: string) => {
    if (email.includes('admin@')) return 'admin';
    if (email.includes('owner@')) return 'store_owner';
    if (email.includes('hr@')) return 'hr_team';
    return 'employee';
  };

  // Core profile loader - with concurrency guard
  const loadUserProfile = useCallback(async (uid: string) => {
    // Prevent concurrent profile loads (race condition fix)
    if (isLoadingProfile.current) {
      console.log('App: Profile load already in progress, skipping duplicate');
      return;
    }
    isLoadingProfile.current = true;
    console.log('App: Loading profile for:', uid);

    // Safety timeout - NEVER leave user stuck loading
    const timeout = setTimeout(() => {
      console.warn('App: Profile load timed out after 5s');
      isLoadingProfile.current = false;
      setIsLoading(false);
    }, 5000);

    try {
      // Query profile from database (NOT auth.getUser which can cause deadlock)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, email, full_name')
        .eq('id', uid)
        .single();

      if (profileError) {
        console.log('App: Profile query error:', profileError.message);
      }

      // Get user metadata for must_change_password check
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || profile?.email || '';

      clearTimeout(timeout);
      setUserId(uid);

      // Check if password change is required
      const mustChange = user?.user_metadata?.must_change_password === true;
      if (mustChange) {
        console.log('App: User must change password');
        const role = profile?.role || inferRoleFromEmail(userEmail);
        setMustChangePassword(true);
        setUserRole(role === 'admin' ? 'admin' : role);
        setIsAuthenticated(true);
        setIsLoading(false);
        isLoadingProfile.current = false;
        return;
      }

      // Determine role
      let role = inferRoleFromEmail(userEmail);
      if (profile?.role) {
        role = profile.role === 'admin' ? 'admin' : profile.role;
      }

      console.log('App: Authenticated as role:', role);
      setMustChangePassword(false);
      setUserRole(role);
      setIsAuthenticated(true);
      setIsLoading(false);
    } catch (error: any) {
      clearTimeout(timeout);
      console.error('App: Profile load error:', error);

      // Fallback: try to get role from email
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(uid);
          setUserRole(inferRoleFromEmail(user.email || ''));
          setMustChangePassword(false);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } catch (e) {
        console.error('App: Complete fallback failed:', e);
        setIsAuthenticated(false);
        setUserRole(null);
      }
      setIsLoading(false);
    } finally {
      isLoadingProfile.current = false;
    }
  }, []);

  useEffect(() => {
    // Global safety timeout - absolute maximum loading time
    safetyTimeoutRef.current = setTimeout(() => {
      console.warn('App: Global safety timeout (6s), forcing load complete');
      setIsLoading(false);
    }, 6000);

    // CRITICAL: The onAuthStateChange callback must NOT be async.
    // Making it async blocks Supabase's internal event queue, causing:
    // - Events to be dropped/delayed
    // - Deadlocks when loadUserProfile calls supabase.auth.getUser()
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('App: Auth event:', event, session?.user?.email || 'no-user');

        if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setUserRole(null);
          setMustChangePassword(false);
          setUserId(null);
          setIsLoading(false);
          return;
        }

        // Skip token refreshes - no need to reload profile
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // For INITIAL_SESSION: only handle if we haven't loaded yet
        if (event === 'INITIAL_SESSION') {
          if (session?.user && !initialLoadDone.current) {
            initialLoadDone.current = true;
            // Use setTimeout(0) to avoid blocking the Supabase event queue
            setTimeout(() => loadUserProfile(session.user.id), 0);
          } else if (!session) {
            initialLoadDone.current = true;
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        // For SIGNED_IN, USER_UPDATED, PASSWORD_RECOVERY
        if (session?.user) {
          initialLoadDone.current = true;
          // Non-blocking: schedule profile load outside the callback
          setTimeout(() => loadUserProfile(session.user.id), 0);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
          setIsLoading(false);
        }
      }
    );

    // Fallback: if INITIAL_SESSION never fires (older Supabase versions)
    // do a manual check after a short delay
    const fallbackTimer = setTimeout(async () => {
      if (!initialLoadDone.current) {
        console.log('App: Fallback session check (INITIAL_SESSION may not have fired)');
        initialLoadDone.current = true;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            loadUserProfile(session.user.id);
          } else {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
        } catch {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    }, 1500);

    return () => {
      authListener?.subscription?.unsubscribe();
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [loadUserProfile]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading Mawared App...</Text>
      </View>
    );
  }

  const renderNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    if (mustChangePassword && userId) {
      return <ForceChangePasswordNavigator userId={userId} />;
    }

    switch (userRole) {
      case 'store_owner':
        return <StoreOwnerNavigator />;
      case 'hr_team':
      case 'hr':
        return <HRNavigator />;
      case 'super_admin':
      case 'admin':
        return <SuperAdminNavigator />;
      default:
        return <EmployeeNavigator />;
    }
  };

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme as any}>
          {renderNavigator()}
        </NavigationContainer>
      </PaperProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Main />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
});
