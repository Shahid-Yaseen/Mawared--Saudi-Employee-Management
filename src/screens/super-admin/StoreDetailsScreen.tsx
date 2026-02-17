import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';
import { supabase } from '../../services/supabase';

export default function StoreDetailsScreen({ route, navigation }: any) {
    const { storeId } = route.params;
    const { theme } = useTheme();
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        loadStoreDetails();
    }, [storeId]);

    const loadStoreDetails = async () => {
        setLoading(true);
        try {
            const result = await adminApi.getStoreDetails(storeId);
            if (result.success && result.store) {
                setStore(result.store);
            } else {
                console.error('Store not found in API response');
            }
        } catch (error) {
            console.error('Error loading store details:', error);
        } finally {
            setLoading(false);
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
                { text: 'Confirm', style: 'destructive', onPress: onConfirm },
            ]);
        }
    };

    const handleResendCredentials = async () => {
        if (!store?.owner_profile) {
            showAlert('Error', 'No owner profile found for this store');
            return;
        }
        const owner = store.owner_profile;
        showConfirm(
            'Resend Credentials',
            `This will generate a new temporary password and send login credentials to ${owner.email}.\n\nContinue?`,
            async () => {
                setResending(true);
                try {
                    const result = await adminApi.resendCredentials(owner.id);
                    showAlert(
                        'Credentials Sent',
                        `Temporary Password: ${result.tempPassword}\n\nEmail delivered: ${result.emailSent ? 'Yes' : 'No - share password manually'}`
                    );
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to resend credentials');
                } finally {
                    setResending(false);
                }
            }
        );
    };

    const handleResetPassword = async () => {
        if (!store?.owner_profile) {
            showAlert('Error', 'No owner profile found');
            return;
        }
        const owner = store.owner_profile;
        showConfirm(
            'Reset Password',
            `Reset password for ${owner.full_name}? A new temporary password will be generated.`,
            async () => {
                setResending(true);
                try {
                    const result = await adminApi.resetUserPassword(owner.id, owner.email, owner.full_name);
                    showAlert(
                        'Password Reset',
                        `New Temporary Password: ${result.tempPassword}\n\nThe owner will need to change this on next login.`
                    );
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to reset password');
                } finally {
                    setResending(false);
                }
            }
        );
    };

    const handleToggleStatus = async () => {
        if (!store) return;
        const newStatus = store.status === 'active' ? 'inactive' : 'active';
        try {
            await adminApi.toggleStoreStatus(storeId, newStatus);
            showAlert('Success', `Store ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
            loadStoreDetails();
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to update store status');
        }
    };

    const handleDeleteStore = () => {
        if (!store) return;
        showConfirm(
            'Delete Store',
            `Are you sure you want to delete "${store.store_name}"?\n\nThis will also delete all employees. This action cannot be undone.`,
            async () => {
                try {
                    await adminApi.deleteStore(storeId);
                    showAlert('Success', 'Store deleted successfully!');
                    navigation.goBack();
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete store');
                }
            }
        );
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!store) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={{ color: theme.colors.text, marginTop: 10, fontSize: 16 }}>Store not found</Text>
                <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} buttonColor={theme.colors.primary}>
                    Go Back
                </Button>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Title style={styles.headerTitle}>{store.store_name}</Title>
                    <Text style={styles.headerSubtitle}>{store.store_number || 'No store number'}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('EditStore', { storeId, initialData: store })}
                    style={styles.editButton}
                >
                    <Ionicons name="create-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* General Information */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="information" size={24} color={theme.colors.primary} />
                            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>General Information</Title>
                        </View>
                        <Divider style={styles.divider} />

                        <List.Item
                            title="Status"
                            description={() => (
                                <Chip
                                    mode="flat"
                                    style={{
                                        backgroundColor: store.status === 'active' ? '#10B98120' : '#EF444420',
                                        alignSelf: 'flex-start',
                                        marginTop: 4,
                                    }}
                                    textStyle={{ color: store.status === 'active' ? '#10B981' : '#EF4444' }}
                                >
                                    {store.status === 'active' ? 'Active' : 'Inactive'}
                                </Chip>
                            )}
                            left={props => <List.Icon {...props} icon="toggle-switch" color={store.status === 'active' ? '#10B981' : '#EF4444'} />}
                        />
                        <List.Item
                            title="Phone"
                            description={store.phone || 'Not provided'}
                            left={props => <List.Icon {...props} icon="phone" color={theme.colors.primary} />}
                        />
                        <List.Item
                            title="Employees"
                            description={`${store.employee_count || 0} employee(s)`}
                            left={props => <List.Icon {...props} icon="account-group" color={theme.colors.primary} />}
                        />
                        <List.Item
                            title="Created"
                            description={store.created_at ? new Date(store.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                            left={props => <List.Icon {...props} icon="calendar" color={theme.colors.primary} />}
                        />
                    </Card.Content>
                </Card>

                {/* Owner Details */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Owner Details</Title>
                        </View>
                        <Divider style={styles.divider} />

                        {store.owner_profile ? (
                            <>
                                <List.Item
                                    title="Full Name"
                                    description={store.owner_profile.full_name}
                                    left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
                                />
                                <List.Item
                                    title="Email"
                                    description={store.owner_profile.email}
                                    left={props => <List.Icon {...props} icon="email" color={theme.colors.primary} />}
                                />
                                <List.Item
                                    title="Phone"
                                    description={store.owner_profile.phone || 'N/A'}
                                    left={props => <List.Icon {...props} icon="phone-outline" color={theme.colors.primary} />}
                                />
                                <List.Item
                                    title="Role"
                                    description={store.owner_profile.role || 'store_owner'}
                                    left={props => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
                                />
                            </>
                        ) : (
                            <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>No owner assigned</Text>
                        )}
                    </Card.Content>
                </Card>

                {/* Owner Actions */}
                {store.owner_profile && (
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                        <Card.Content>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="key" size={24} color={theme.colors.primary} />
                                <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Owner Account Actions</Title>
                            </View>
                            <Divider style={styles.divider} />

                            <View style={styles.ownerActions}>
                                <Button
                                    mode="outlined"
                                    onPress={handleResendCredentials}
                                    icon="email-fast"
                                    style={[styles.ownerActionBtn, { borderColor: '#F59E0B' }]}
                                    labelStyle={{ color: '#F59E0B' }}
                                    loading={resending}
                                    disabled={resending}
                                >
                                    Resend Credentials Email
                                </Button>
                                <Button
                                    mode="outlined"
                                    onPress={handleResetPassword}
                                    icon="lock-reset"
                                    style={[styles.ownerActionBtn, { borderColor: theme.colors.primary }]}
                                    labelStyle={{ color: theme.colors.primary }}
                                    loading={resending}
                                    disabled={resending}
                                >
                                    Reset Password
                                </Button>
                            </View>
                        </Card.Content>
                    </Card>
                )}

                {/* Store Actions */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.primary} />
                            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Store Actions</Title>
                        </View>
                        <Divider style={styles.divider} />

                        <View style={styles.storeActions}>
                            <Button
                                mode="contained"
                                onPress={() => navigation.navigate('EditStore', { storeId, initialData: store })}
                                icon="pencil"
                                buttonColor={theme.colors.primary}
                                textColor="white"
                                style={styles.storeActionBtn}
                            >
                                Edit Store
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={handleToggleStatus}
                                icon={store.status === 'active' ? 'toggle-switch-off' : 'toggle-switch'}
                                style={[styles.storeActionBtn, { borderColor: store.status === 'active' ? '#F59E0B' : '#10B981' }]}
                                labelStyle={{ color: store.status === 'active' ? '#F59E0B' : '#10B981' }}
                            >
                                {store.status === 'active' ? 'Deactivate Store' : 'Activate Store'}
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={handleDeleteStore}
                                icon="delete"
                                style={[styles.storeActionBtn, { borderColor: '#EF4444' }]}
                                labelStyle={{ color: '#EF4444' }}
                            >
                                Delete Store
                            </Button>
                        </View>
                    </Card.Content>
                </Card>

                <Button
                    mode="text"
                    onPress={() => navigation.goBack()}
                    style={styles.backButtonBottom}
                    textColor={theme.colors.primary}
                    icon="arrow-left"
                >
                    Back to Store List
                </Button>
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
    editButton: {
        padding: 5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        marginLeft: 10,
        fontSize: 18,
    },
    divider: {
        marginVertical: 8,
    },
    ownerActions: {
        gap: 10,
        marginTop: 8,
    },
    ownerActionBtn: {
        borderRadius: 8,
    },
    storeActions: {
        gap: 10,
        marginTop: 8,
    },
    storeActionBtn: {
        borderRadius: 8,
    },
    backButtonBottom: {
        marginTop: 24,
        marginBottom: 40,
    },
});
