import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { Card, TextInput, Button, Title } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors as StaticColors } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function ForceChangePasswordScreen({ route }: any) {
    const { theme } = useTheme();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleChangePassword = async () => {
        setError('');

        if (newPassword.length < 8) {
            const msg = 'Password must be at least 8 characters long';
            setError(msg);
            showAlert('Validation Error', msg);
            return;
        }
        if (newPassword !== confirmPassword) {
            const msg = 'Passwords do not match';
            setError(msg);
            showAlert('Validation Error', msg);
            return;
        }

        setLoading(true);
        try {
            console.log('ForceChange: Updating password...');
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
                data: { must_change_password: false }
            });

            if (updateError) {
                console.error('ForceChange: Update error:', updateError);
                throw updateError;
            }

            console.log('ForceChange: Password updated successfully');
            // The USER_UPDATED event in App.tsx will detect must_change_password=false
            // and switch to the dashboard navigator. Show a brief message.
            showAlert('Success', 'Password changed successfully! Redirecting...');
            // NOTE: Don't setLoading(false) here — let App.tsx handle the transition.
            // The auth listener will fire USER_UPDATED and reload the profile.
        } catch (err: any) {
            console.error('ForceChange: Error:', err);
            const msg = err.message || 'Failed to change password';
            setError(msg);
            showAlert('Error', msg);
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.contentContainer}
        >
            <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
                </View>
            </View>

            <Title style={[styles.title, { color: theme.colors.text }]}>Change Password Required</Title>

            <View style={[styles.warningBox, {
                backgroundColor: theme.colors.primary + '15',
                borderLeftColor: theme.colors.primary
            }]}>
                <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                <Text style={[styles.warningText, { color: theme.colors.text }]}>
                    For your security, you must set a new password before you can access your account.
                </Text>
            </View>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    {error ? (
                        <View style={styles.errorBanner}>
                            <Ionicons name="alert-circle" size={18} color="#D32F2F" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        mode="outlined"
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        left={<TextInput.Icon icon="lock" color={theme.colors.textSecondary} />}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? 'eye-off' : 'eye'}
                                color={theme.colors.textSecondary}
                                onPress={() => setShowPassword(!showPassword)}
                            />
                        }
                    />

                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        mode="outlined"
                        style={styles.input}
                        secureTextEntry={!showConfirmPassword}
                        outlineColor={theme.colors.divider}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.text}
                        left={<TextInput.Icon icon="lock-check" color={theme.colors.textSecondary} />}
                        right={
                            <TextInput.Icon
                                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                                color={theme.colors.textSecondary}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            />
                        }
                    />

                    <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                        Password must be at least 8 characters long
                    </Text>

                    <Button
                        mode="contained"
                        onPress={handleChangePassword}
                        style={styles.submitButton}
                        buttonColor={theme.colors.primary}
                        loading={loading}
                        disabled={loading}
                    >
                        Update Password & Login
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        justifyContent: 'center',
        flexGrow: 1,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 4,
    },
    warningText: {
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    card: {
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    input: {
        marginBottom: 16,
    },
    hint: {
        fontSize: 12,
        marginBottom: 24,
    },
    submitButton: {
        borderRadius: 8,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        marginLeft: 8,
        flex: 1,
        fontSize: 14,
    },
});
