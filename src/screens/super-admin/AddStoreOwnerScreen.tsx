import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Card, TextInput, Button, Title, Paragraph, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

// Cross-platform alert helper
function showAlert(title: string, message: string, onOk?: () => void) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        onOk?.();
    } else {
        Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
}

export default function AddStoreOwnerScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [storeName, setStoreName] = useState('');
    const [storeNumber, setStoreNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const validateEmail = (emailVal: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(emailVal);
    };

    const handleSubmit = async () => {
        setErrorMsg('');

        if (!fullName.trim()) {
            setErrorMsg('Full name is required');
            showAlert('Validation Error', 'Full name is required');
            return;
        }
        if (!email.trim() || !validateEmail(email.trim())) {
            setErrorMsg('A valid email address is required');
            showAlert('Validation Error', 'A valid email address is required');
            return;
        }
        if (!storeName.trim()) {
            setErrorMsg('Store name is required');
            showAlert('Validation Error', 'Store name is required');
            return;
        }

        setLoading(true);
        try {
            console.log('API Request: Creating store owner...', { email, fullName, storeName });
            const result = await adminApi.createStoreOwner({
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                storeName: storeName.trim(),
                storeNumber: storeNumber.trim() || undefined,
            });

            console.log('API Response:', result);

            const tempPassword = result.tempPassword || result.data?.tempPassword || result.credentials?.password || 'User should check email';
            const emailSent = result.emailSent !== false;

            showAlert(
                'Store Owner Created',
                `Store owner has been created successfully.\n\nTemporary Password: ${tempPassword}\n\nEmail notification: ${emailSent ? 'Sent' : 'Not sent'}`,
                () => navigation.goBack()
            );
        } catch (error: any) {
            console.error('Create store owner error:', error);
            const msg = error.message || 'Failed to create store owner';
            setErrorMsg(msg);
            showAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Title style={styles.headerTitle}>Add Store Owner</Title>
                    <Paragraph style={styles.headerSubtitle}>Create a new store owner account</Paragraph>
                </View>
            </View>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Owner Information</Text>

                    <TextInput
                        label="Full Name *"
                        value={fullName}
                        onChangeText={setFullName}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="account" />}
                    />

                    <TextInput
                        label="Email *"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        left={<TextInput.Icon icon="email" />}
                    />

                    <TextInput
                        label="Phone"
                        value={phone}
                        onChangeText={setPhone}
                        mode="outlined"
                        style={styles.input}
                        keyboardType="phone-pad"
                        left={<TextInput.Icon icon="phone" />}
                    />
                </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Store Information</Text>

                    <TextInput
                        label="Store Name *"
                        value={storeName}
                        onChangeText={setStoreName}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="store" />}
                    />

                    <TextInput
                        label="Store Number"
                        value={storeNumber}
                        onChangeText={setStoreNumber}
                        mode="outlined"
                        style={styles.input}
                        left={<TextInput.Icon icon="numeric" />}
                    />
                </Card.Content>
            </Card>

            <View style={styles.buttonContainer}>
                {errorMsg ? (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle" size={18} color="#D32F2F" />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                ) : null}
                <View style={styles.buttonRow}>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        style={[styles.cancelButton, { borderColor: theme.colors.outline }]}
                        labelStyle={{ color: theme.colors.primary }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        style={styles.submitButton}
                        buttonColor={theme.colors.primary}
                        textColor="white"
                        disabled={loading}
                        loading={loading}
                    >
                        {loading ? 'Creating...' : 'Create Store Owner'}
                    </Button>
                </View>
            </View>

            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
        padding: 4,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: '#fff',
        opacity: 0.9,
    },
    card: {
        margin: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    input: {
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    buttonContainer: {
        padding: 10,
        marginTop: 10,
    },
    buttonRow: {
        flexDirection: 'row',
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
    },
    submitButton: {
        flex: 2,
        marginLeft: 8,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        marginLeft: 8,
        flex: 1,
        fontSize: 14,
    },
    bottomSpacer: {
        height: 40,
    },
});
