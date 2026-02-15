import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function LoginScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            setError(t('auth.invalidEmail'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (signInError) throw signInError;

            // Navigation will be handled by auth state listener in App.tsx
        } catch (err: any) {
            setError(err.message || t('auth.loginError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.logoText}>موارد</Text>
                    </View>
                    <Text style={[styles.appName, { color: theme.colors.text }]}>{t('common.appName')}</Text>
                    <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                        Simplifying Employee Management
                    </Text>
                </View>

                {/* Title */}
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.loginTitle')}</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('auth.loginSubtitle')}</Text>
                </View>

                {/* Error Message */}
                {error ? (
                    <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                    </View>
                ) : null}

                {/* Form */}
                <View style={styles.formContainer}>
                    <TextInput
                        label={t('common.email')}
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <TextInput
                        label={t('common.password')}
                        value={password}
                        onChangeText={setPassword}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoComplete="password"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? 'eye-off' : 'eye'}
                                color={theme.colors.textSecondary}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                    />

                    <TouchableOpacity
                        onPress={() => navigation.navigate('ForgotPassword')}
                        style={styles.forgotPasswordButton}
                        disabled={loading}
                    >
                        <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                            {t('common.forgotPassword')}
                        </Text>
                    </TouchableOpacity>

                    <Button
                        mode="contained"
                        onPress={handleLogin}
                        loading={loading}
                        disabled={loading}
                        style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
                        contentStyle={styles.loginButtonContent}
                        labelStyle={styles.loginButtonLabel}
                        textColor="#FFFFFF"
                    >
                        {t('common.login')}
                    </Button>
                </View>

                {/* Register Link */}
                <View style={styles.registerContainer}>
                    <Text style={[styles.registerText, { color: theme.colors.textSecondary }]}>
                        Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Register')}
                        disabled={loading}
                    >
                        <Text style={[styles.registerLink, { color: theme.colors.primary }]}>{t('common.register')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.lg,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    appName: {
        ...Typography.h2,
        marginBottom: Spacing.xs,
    },
    tagline: {
        ...Typography.caption,
    },
    titleContainer: {
        marginBottom: Spacing.lg,
    },
    title: {
        ...Typography.h3,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        ...Typography.body,
    },
    errorContainer: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    errorText: {
        ...Typography.body,
    },
    formContainer: {
        marginBottom: Spacing.lg,
    },
    input: {
        marginBottom: Spacing.md,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: Spacing.md,
    },
    forgotPasswordText: {
        ...Typography.body,
    },
    loginButton: {
        borderRadius: BorderRadius.md,
    },
    loginButtonContent: {
        height: 48,
    },
    loginButtonLabel: {
        ...Typography.h5,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        ...Typography.body,
    },
    registerLink: {
        ...Typography.body,
        fontWeight: '600',
    },
});
