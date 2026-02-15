import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { supabase } from './src/services/supabase';
import { Colors } from './src/constants/theme';

// Initialize i18n
import './src/locales/i18n';

// Import navigators
import { AuthNavigator, EmployeeNavigator, StoreOwnerNavigator, HRNavigator, SuperAdminNavigator } from './src/navigation';

import { ThemeProvider, useTheme } from './src/store/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';

const queryClient = new QueryClient();

function Main() {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
        }
      }
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const checkUser = async () => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    } catch (error: any) {
      console.error('App: Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      // Get current user email first for fallback
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      // If profile exists, use it. Otherwise fallback to email-based role.
      if (profile?.role) {
        setUserRole(profile.role);
      } else if (userEmail.includes('owner@')) {
        setUserRole('store_owner');
      } else if (userEmail.includes('hr@') || userEmail.includes('admin@')) {
        setUserRole('store_owner'); // For testing purposes, admins/hr with fallback email get owner layout or we can set 'hr' if we had a dedicated HR role/navigator
      } else {
        setUserRole('employee');
      }
      setIsAuthenticated(true);
    } catch (error) {
      // On error, check email for fallback
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';

      if (userEmail.includes('owner@') || userEmail.includes('admin@')) {
        setUserRole('store_owner');
      } else {
        setUserRole('employee');
      }
      setIsAuthenticated(true);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading Mawared App...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme as any}>
          {!isAuthenticated ? (
            <AuthNavigator />
          ) : userRole === 'store_owner' ? (
            <StoreOwnerNavigator />
          ) : userRole === 'hr' ? (
            <HRNavigator />
          ) : userRole === 'admin' ? (
            <SuperAdminNavigator />
          ) : (
            <EmployeeNavigator />
          )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
