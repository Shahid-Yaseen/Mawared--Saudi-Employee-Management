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

export default function ForgotPasswordScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async () => {
        if (!email) {
            setError(t('auth.invalidEmail'));
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                email.trim(),
                {
                    redirectTo: 'mawared://reset-password',
                }
            );

            if (resetError) throw resetError;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Icon */}
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Text style={styles.iconText}>🔒</Text>
                    </View>
                </View>

                {/* Title */}
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.forgotPasswordTitle')}</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        {t('auth.forgotPasswordSubtitle')}
                    </Text>
                </View>

                {/* Success Message */}
                {success ? (
                    <View style={[styles.successContainer, { backgroundColor: theme.colors.success + '20' }]}>
                        <Text style={[styles.successText, { color: theme.colors.success }]}>
                            {t('auth.resetLinkSent')}
                        </Text>
                        <Button
                            mode="contained"
                            onPress={() => navigation.navigate('Login')}
                            style={[styles.backToLoginButton, { backgroundColor: theme.colors.primary }]}
                            contentStyle={styles.buttonContent}
                            textColor="#FFFFFF"
                        >
                            Back to Login
                        </Button>
                    </View>
                ) : (
                    <>
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

                            <Button
                                mode="contained"
                                onPress={handleResetPassword}
                                loading={loading}
                                disabled={loading}
                                style={[styles.resetButton, { backgroundColor: theme.colors.primary }]}
                                contentStyle={styles.buttonContent}
                                labelStyle={styles.buttonLabel}
                                textColor="#FFFFFF"
                            >
                                Send Reset Link
                            </Button>
                        </View>
                    </>
                )}
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
    header: {
        position: 'absolute',
        top: Spacing.lg,
        left: Spacing.lg,
    },
    backButton: {
        padding: Spacing.sm,
    },
    backButtonText: {
        ...Typography.body,
        fontWeight: '600',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 48,
    },
    titleContainer: {
        marginBottom: Spacing.lg,
        alignItems: 'center',
    },
    title: {
        ...Typography.h3,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...Typography.body,
        textAlign: 'center',
    },
    errorContainer: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    errorText: {
        ...Typography.body,
        textAlign: 'center',
    },
    successContainer: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    successText: {
        ...Typography.body,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    formContainer: {
        marginBottom: Spacing.lg,
    },
    input: {
        marginBottom: Spacing.md,
    },
    resetButton: {
        borderRadius: BorderRadius.md,
    },
    backToLoginButton: {
        borderRadius: BorderRadius.md,
    },
    buttonContent: {
        height: 48,
    },
    buttonLabel: {
        ...Typography.h5,
    },
});
