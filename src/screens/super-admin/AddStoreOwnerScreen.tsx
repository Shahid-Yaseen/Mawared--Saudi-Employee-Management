import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { Card, TextInput, Button, Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { adminApi } from '../../services/adminApi';

export default function AddStoreOwnerScreen({ navigation }: any) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [storeName, setStoreName] = useState('');
    const [storeNumber, setStoreNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleSubmit = async () => {
        if (!fullName.trim()) {
            Alert.alert('Validation Error', 'Full name is required');
            return;
        }
        if (!email.trim() || !validateEmail(email.trim())) {
            Alert.alert('Validation Error', 'A valid email address is required');
            return;
        }
        if (!storeName.trim()) {
            Alert.alert('Validation Error', 'Store name is required');
            return;
        }

        setLoading(true);
        try {
            const result = await adminApi.createStoreOwner({
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                storeName: storeName.trim(),
                storeNumber: storeNumber.trim() || undefined,
            });

            const tempPassword = result.tempPassword || result.data?.tempPassword || 'Check email';
            const emailSent = result.emailSent !== false;

            Alert.alert(
                'Store Owner Created',
                `Store owner has been created successfully.\n\nTemporary Password: ${tempPassword}\n\nEmail notification: ${emailSent ? 'Sent' : 'Not sent - please share credentials manually'}`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create store owner');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Title style={styles.headerTitle}>Add Store Owner</Title>
                    <Paragraph style={styles.headerSubtitle}>Create a new store owner account</Paragraph>
                </View>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.sectionTitle}>Owner Information</Text>

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

            <Card style={styles.card}>
                <Card.Content>
                    <Text style={styles.sectionTitle}>Store Information</Text>

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
                <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.cancelButton}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    style={styles.submitButton}
                    buttonColor={Colors.primary}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        'Create Store Owner'
                    )}
                </Button>
            </View>

            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 20,
        backgroundColor: Colors.primary,
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
        color: Colors.text,
        marginBottom: 12,
    },
    input: {
        marginBottom: 12,
        backgroundColor: Colors.white,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 10,
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
    },
    submitButton: {
        flex: 2,
        marginLeft: 8,
    },
    bottomSpacer: {
        height: 40,
    },
});
