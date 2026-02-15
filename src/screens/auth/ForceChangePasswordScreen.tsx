import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { Card, TextInput, Button, Title } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

export default function ForceChangePasswordScreen({ route }: any) {
    const { userId } = route.params;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            Alert.alert('Validation Error', 'Password must be at least 8 characters long');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Validation Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) throw updateError;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ must_change_password: false })
                .eq('id', userId);

            if (profileError) throw profileError;

            Alert.alert('Success', 'Password changed successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <Ionicons name="lock-closed" size={48} color={Colors.warning} />
                </View>
            </View>

            <Title style={styles.title}>Change Password Required</Title>

            <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color={Colors.warning} />
                <Text style={styles.warningText}>
                    You must change your password before continuing
                </Text>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        mode="outlined"
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                            <TextInput.Icon
                                icon={showPassword ? 'eye-off' : 'eye'}
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
                        left={<TextInput.Icon icon="lock-check" />}
                        right={
                            <TextInput.Icon
                                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            />
                        }
                    />

                    <Text style={styles.hint}>Password must be at least 8 characters long</Text>

                    <Button
                        mode="contained"
                        onPress={handleChangePassword}
                        style={styles.submitButton}
                        buttonColor={Colors.primary}
                        loading={loading}
                        disabled={loading}
                    >
                        Change Password
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    contentContainer: {
        padding: 20,
        justifyContent: 'center',
        flexGrow: 1,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.warning + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.warning + '15',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: Colors.warning,
    },
    warningText: {
        fontSize: 14,
        color: Colors.text,
        marginLeft: 10,
        flex: 1,
    },
    card: {
        elevation: 2,
    },
    input: {
        marginBottom: 12,
        backgroundColor: Colors.white,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    submitButton: {
        marginTop: 8,
        paddingVertical: 4,
    },
});
