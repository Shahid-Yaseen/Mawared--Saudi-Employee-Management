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

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
          await loadUserProfile(session?.user?.id || '');
          return;
        }
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setIsAuthenticated(false);
          setUserRole(null);
          setMustChangePassword(false);
          setUserId(null);
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

  const loadUserProfile = async (uid: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, must_change_password')
        .eq('id', uid)
        .single();

      setUserId(uid);

      if (profile?.must_change_password) {
        setMustChangePassword(true);
        setIsAuthenticated(true);
        setUserRole(profile.role || 'employee');
        return;
      }

      setMustChangePassword(false);

      if (profile?.role) {
        setUserRole(profile.role);
      } else if (userEmail.includes('owner@')) {
        setUserRole('store_owner');
      } else if (userEmail.includes('hr@')) {
        setUserRole('hr_team');
      } else if (userEmail.includes('admin@')) {
        setUserRole('super_admin');
      } else {
        setUserRole('employee');
      }
      setIsAuthenticated(true);
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || '';
      setUserId(uid);

      if (userEmail.includes('admin@')) {
        setUserRole('super_admin');
      } else if (userEmail.includes('owner@')) {
        setUserRole('store_owner');
      } else if (userEmail.includes('hr@')) {
        setUserRole('hr_team');
      } else {
        setUserRole('employee');
      }
      setMustChangePassword(false);
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
