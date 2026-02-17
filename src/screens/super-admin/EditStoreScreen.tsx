import React, { useState, useEffect } from 'react';
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
import { Card, TextInput, Button, Title, Divider, Switch } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

export default function EditStoreScreen({ route, navigation }: any) {
    const { storeId, initialData } = route.params;
    const { theme } = useTheme();

    // Store fields
    const [storeName, setStoreName] = useState(initialData?.store_name || '');
    const [storeNumber, setStoreNumber] = useState(initialData?.store_number || '');
    const [storePhone, setStorePhone] = useState(initialData?.phone || '');
    const [isActive, setIsActive] = useState(initialData?.status === 'active');

    // Owner fields
    const [ownerName, setOwnerName] = useState(initialData?.owner_profile?.full_name || '');
    const [ownerEmail, setOwnerEmail] = useState(initialData?.owner_profile?.email || '');
    const [ownerPhone, setOwnerPhone] = useState(initialData?.owner_profile?.phone || '');
    const ownerId = initialData?.owner_id || initialData?.owner_profile?.id || null;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!initialData);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (!initialData) {
            loadStoreDetails();
        }
    }, [storeId]);

    const loadStoreDetails = async () => {
        setFetching(true);
        try {
            const result = await adminApi.getStoreDetails(storeId);
            if (result.success && result.store) {
                setStoreName(result.store.store_name || '');
                setStoreNumber(result.store.store_number || '');
                setStorePhone(result.store.phone || '');
                setIsActive(result.store.status === 'active');
                if (result.store.owner_profile) {
                    setOwnerName(result.store.owner_profile.full_name || '');
                    setOwnerEmail(result.store.owner_profile.email || '');
                    setOwnerPhone(result.store.owner_profile.phone || '');
                }
            }
        } catch (error) {
            console.error('Error loading store:', error);
            showAlert('Error', 'Failed to load store details');
        } finally {
            setFetching(false);
        }
    };

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            alert(title + '\n\n' + message);
        } else {
            Alert.alert(title, message);
        }
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        if (Platform.OS === 'web') {
            if (window.confirm(title + '\n\n' + message)) onConfirm();
        } else {
            Alert.alert(title, message, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: onConfirm },
            ]);
        }
    };

    const handleUpdate = async () => {
        if (!storeName.trim()) {
            showAlert('Validation Error', 'Store name is required');
            return;
        }
        if (ownerName.trim() === '') {
            showAlert('Validation Error', 'Owner name is required');
            return;
        }

        setLoading(true);
        try {
            // Update store fields
            await adminApi.updateStore({
                storeId,
                storeName: storeName.trim(),
                storeNumber: storeNumber.trim(),
                phone: storePhone.trim() || undefined,
                status: isActive ? 'active' : 'inactive',
            });

            // Update owner profile if we have ownerId
            if (ownerId) {
                await adminApi.updateStoreOwner({
                    userId: ownerId,
                    fullName: ownerName.trim(),
                    phone: ownerPhone.trim() || undefined,
                });
            }

            showAlert('Success', 'Store updated successfully');
            navigation.goBack();
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to update store');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCredentials = () => {
        if (!ownerId) {
            showAlert('Error', 'No owner found for this store');
            return;
        }
        showConfirm(
            'Resend Credentials',
            `This will generate a new password and send credentials to ${ownerEmail}.\n\nContinue?`,
            async () => {
                setResending(true);
                try {
                    const result = await adminApi.resendCredentials(ownerId);
                    showAlert(
                        'Credentials Sent',
                        `Temporary Password: ${result.tempPassword}\n\nEmail delivered: ${result.emailSent ? 'Yes' : 'No'}`
                    );
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to resend credentials');
                } finally {
                    setResending(false);
                }
            }
        );
    };

    if (fetching) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Title style={styles.headerTitle}>Edit Store</Title>
            </View>

            <View style={styles.content}>
                {/* Store Information */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="store" size={22} color={theme.colors.primary} />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Store Information</Text>
                        </View>

                        <TextInput
                            label="Store Name *"
                            value={storeName}
                            onChangeText={setStoreName}
                            mode="outlined"
                            style={styles.input}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            left={<TextInput.Icon icon="store" />}
                        />

                        <TextInput
                            label="Store Number"
                            value={storeNumber}
                            onChangeText={setStoreNumber}
                            mode="outlined"
                            style={styles.input}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            left={<TextInput.Icon icon="numeric" />}
                        />

                        <TextInput
                            label="Store Phone"
                            value={storePhone}
                            onChangeText={setStorePhone}
                            mode="outlined"
                            style={styles.input}
                            keyboardType="phone-pad"
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            left={<TextInput.Icon icon="phone" />}
                        />

                        <View style={styles.statusRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.statusLabel, { color: theme.colors.text }]}>Store Status</Text>
                                <Text style={[styles.statusHint, { color: theme.colors.textSecondary }]}>
                                    {isActive ? 'Store is currently active' : 'Store is currently inactive'}
                                </Text>
                            </View>
                            <Switch
                                value={isActive}
                                onValueChange={setIsActive}
                                color={theme.colors.primary}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* Owner Information */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="account" size={22} color={theme.colors.primary} />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Owner Information</Text>
                        </View>

                        <TextInput
                            label="Owner Name *"
                            value={ownerName}
                            onChangeText={setOwnerName}
                            mode="outlined"
                            style={styles.input}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            left={<TextInput.Icon icon="account" />}
                        />

                        <TextInput
                            label="Owner Email"
                            value={ownerEmail}
                            mode="outlined"
                            style={styles.input}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            disabled
                            left={<TextInput.Icon icon="email" />}
                        />

                        <TextInput
                            label="Owner Phone"
                            value={ownerPhone}
                            onChangeText={setOwnerPhone}
                            mode="outlined"
                            style={styles.input}
                            keyboardType="phone-pad"
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                            left={<TextInput.Icon icon="phone" />}
                        />

                        <Divider style={{ marginVertical: 12 }} />

                        <Button
                            mode="outlined"
                            onPress={handleResendCredentials}
                            icon="email-fast"
                            style={[styles.credentialsBtn, { borderColor: '#F59E0B' }]}
                            labelStyle={{ color: '#F59E0B' }}
                            loading={resending}
                            disabled={resending || !ownerId}
                        >
                            Resend Credentials Email
                        </Button>
                    </Card.Content>
                </Card>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        style={[styles.cancelBtn, { borderColor: theme.colors.outline }]}
                        labelStyle={{ color: theme.colors.primary }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleUpdate}
                        style={styles.saveBtn}
                        buttonColor={theme.colors.primary}
                        loading={loading}
                        disabled={loading}
                        icon="content-save"
                    >
                        Save Changes
                    </Button>
                </View>

                <View style={{ height: 40 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        paddingTop: 40,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    input: {
        marginBottom: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    statusLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    statusHint: {
        fontSize: 12,
        marginTop: 2,
    },
    credentialsBtn: {
        borderRadius: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        borderRadius: 8,
    },
    saveBtn: {
        flex: 2,
        borderRadius: 8,
    },
});
