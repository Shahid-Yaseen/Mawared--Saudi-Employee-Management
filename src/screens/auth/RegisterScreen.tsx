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

export default function RegisterScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        storeName: '',
        storeNameAr: '',
        commercialRegistration: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!formData.email || !formData.password || !formData.fullName) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.password.length < 8) {
            setError(t('auth.invalidPassword'));
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                        phone: formData.phone,
                        role: 'store_owner',
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (authData.user) {
                // 2. Create profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        email: formData.email.trim(),
                        full_name: formData.fullName,
                        phone: formData.phone,
                        role: 'store_owner',
                    });

                if (profileError) throw profileError;

                // Note: Store creation will be handled after email verification
                // or in a separate onboarding flow

                // Show success message
                alert('Registration successful! Please check your email to verify your account.');
                navigation.navigate('Login');
            }
        } catch (err: any) {
            setError(err.message || t('auth.registerError'));
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
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

                {/* Title */}
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{t('auth.registerTitle')}</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('auth.registerSubtitle')}</Text>
                </View>

                {/* Error Message */}
                {error ? (
                    <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                    </View>
                ) : null}

                {/* Form */}
                <View style={styles.formContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>

                    <TextInput
                        label={t('auth.fullName') + ' *'}
                        value={formData.fullName}
                        onChangeText={(value) => updateFormData('fullName', value)}
                        mode="outlined"
                        autoCapitalize="words"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <TextInput
                        label={t('common.email') + ' *'}
                        value={formData.email}
                        onChangeText={(value) => updateFormData('email', value)}
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
                        label={t('auth.phone')}
                        value={formData.phone}
                        onChangeText={(value) => updateFormData('phone', value)}
                        mode="outlined"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <TextInput
                        label={t('common.password') + ' *'}
                        value={formData.password}
                        onChangeText={(value) => updateFormData('password', value)}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
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

                    <TextInput
                        label="Confirm Password *"
                        value={formData.confirmPassword}
                        onChangeText={(value) => updateFormData('confirmPassword', value)}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Store Information (Optional)</Text>

                    <TextInput
                        label={t('auth.storeName')}
                        value={formData.storeName}
                        onChangeText={(value) => updateFormData('storeName', value)}
                        mode="outlined"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <TextInput
                        label="Store Name (Arabic)"
                        value={formData.storeNameAr}
                        onChangeText={(value) => updateFormData('storeNameAr', value)}
                        mode="outlined"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <TextInput
                        label={t('auth.commercialRegistration')}
                        value={formData.commercialRegistration}
                        onChangeText={(value) => updateFormData('commercialRegistration', value)}
                        mode="outlined"
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        disabled={loading}
                    />

                    <Button
                        mode="contained"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading}
                        style={[styles.registerButton, { backgroundColor: theme.colors.primary }]}
                        contentStyle={styles.registerButtonContent}
                        labelStyle={styles.registerButtonLabel}
                        textColor="#FFFFFF"
                    >
                        {t('common.register')}
                    </Button>
                </View>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                    <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>Already have an account? </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        disabled={loading}
                    >
                        <Text style={[styles.loginLink, { color: theme.colors.primary }]}>{t('common.login')}</Text>
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
    },
    header: {
        marginBottom: Spacing.md,
    },
    backButton: {
        padding: Spacing.sm,
    },
    backButtonText: {
        ...Typography.body,
        fontWeight: '600',
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
    sectionTitle: {
        ...Typography.h5,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    input: {
        marginBottom: Spacing.md,
    },
    registerButton: {
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
    },
    registerButtonContent: {
        height: 48,
    },
    registerButtonLabel: {
        ...Typography.h5,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    loginText: {
        ...Typography.body,
    },
    loginLink: {
        ...Typography.body,
        fontWeight: '600',
    },
});
