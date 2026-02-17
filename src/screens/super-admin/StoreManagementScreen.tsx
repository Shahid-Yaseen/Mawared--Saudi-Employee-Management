import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Card, Chip, Searchbar, Button, Menu, FAB, Checkbox, IconButton, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';
import { Platform } from 'react-native';

export default function StoreManagementScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [stores, setStores] = useState<any[] | null>(null);
    const [filteredStores, setFilteredStores] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
    const [menuVisible, setMenuVisible] = useState<string | null>(null);
    const [resettingPassword, setResettingPassword] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadStores();
        }, [])
    );

    useEffect(() => {
        if (!stores) return;
        const filtered = stores.filter(
            (store) =>
                store.store_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                store.store_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                store.owner_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                store.owner_profile?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredStores(filtered);
    }, [searchQuery, stores]);

    const loadStores = async () => {
        setRefreshing(true);
        try {
            const result = await adminApi.getStores();
            if (result.success) {
                setStores(result.stores || []);
            } else {
                showAlert('Error', result.error || 'Failed to fetch stores');
                setStores([]);
            }
        } catch (error: any) {
            console.error('API ERROR: getStores failed:', error);
            showAlert('Error', error.message || 'Failed to load stores');
            setStores([]);
        } finally {
            setRefreshing(false);
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

    const handleResetPassword = async (store: any) => {
        const owner = store.owner_profile;
        if (!owner) {
            showAlert('Error', 'Owner profile not found for this store');
            return;
        }
        showConfirm(
            'Reset & Send Password',
            `This will generate a new temporary password for ${owner.full_name} (${owner.email}) and send it via email.\n\nContinue?`,
            async () => {
                setResettingPassword(store.id);
                try {
                    const result = await adminApi.resendCredentials(owner.id);
                    const msg = `Password reset successful!\n\nNew Temporary Password: ${result.tempPassword}\n\nEmail sent: ${result.emailSent ? 'Yes' : 'No - please share the password manually'}`;
                    showAlert('Success', msg);
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to reset password');
                } finally {
                    setResettingPassword(null);
                }
            }
        );
    };

    const handleResendCredentials = async (store: any) => {
        const owner = store.owner_profile;
        if (!owner) {
            showAlert('Error', 'Owner profile not found for this store');
            return;
        }
        showConfirm(
            'Resend Credentials Email',
            `This will generate a new password and send login credentials to ${owner.email}.\n\nContinue?`,
            async () => {
                setResettingPassword(store.id);
                try {
                    const result = await adminApi.resendCredentials(owner.id);
                    const msg = `Credentials sent!\n\nTemporary Password: ${result.tempPassword}\n\nEmail delivered: ${result.emailSent ? 'Yes' : 'No'}`;
                    showAlert('Credentials Sent', msg);
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to resend credentials');
                } finally {
                    setResettingPassword(null);
                }
            }
        );
    };

    const toggleStoreStatus = async (storeId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await adminApi.toggleStoreStatus(storeId, newStatus);
            showAlert('Success', `Store ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
            loadStores();
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to update store status');
        }
    };

    const handleDeleteStore = async (store: any) => {
        showConfirm(
            'Delete Store',
            `Are you sure you want to delete "${store.store_name}"?\n\nThis will also delete all employees associated with this store. This action cannot be undone.`,
            async () => {
                try {
                    await adminApi.deleteStore(store.id);
                    showAlert('Success', 'Store deleted successfully!');
                    loadStores();
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete store');
                }
            }
        );
    };

    const toggleStoreSelection = (storeId: string) => {
        const newSelected = new Set(selectedStores);
        if (newSelected.has(storeId)) {
            newSelected.delete(storeId);
        } else {
            newSelected.add(storeId);
        }
        setSelectedStores(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedStores.size === filteredStores.length) {
            setSelectedStores(new Set());
        } else {
            setSelectedStores(new Set(filteredStores.map(s => s.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStores.size === 0) {
            showAlert('Error', 'No stores selected');
            return;
        }
        showConfirm(
            'Bulk Delete Stores',
            `Are you sure you want to delete ${selectedStores.size} store(s)?\n\nThis will also delete all employees associated with these stores. This action cannot be undone.`,
            async () => {
                try {
                    await adminApi.bulkDeleteStores(Array.from(selectedStores));
                    showAlert('Success', `${selectedStores.size} store(s) deleted successfully!`);
                    setSelectedStores(new Set());
                    setSelectionMode(false);
                    loadStores();
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete stores');
                }
            }
        );
    };

    const cancelSelection = () => {
        setSelectionMode(false);
        setSelectedStores(new Set());
    };

    const renderStore = ({ item }: any) => {
        const isMenuOpen = menuVisible === item.id;

        return (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        {selectionMode && (
                            <Checkbox
                                status={selectedStores.has(item.id) ? 'checked' : 'unchecked'}
                                onPress={() => toggleStoreSelection(item.id)}
                                color={theme.colors.primary}
                            />
                        )}
                        <TouchableOpacity
                            style={[styles.storeInfo, selectionMode && { marginLeft: 8 }]}
                            onPress={() => navigation.navigate('StoreDetails', { storeId: item.id })}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.storeName, { color: theme.colors.text }]}>{item.store_name}</Text>
                            {item.store_number ? (
                                <Text style={[styles.storeNumber, { color: theme.colors.textSecondary }]}>#{item.store_number}</Text>
                            ) : null}
                            <Text style={[styles.ownerName, { color: theme.colors.primary }]}>
                                Owner: {item.owner_profile?.full_name || 'Unknown'}
                            </Text>
                            <Text style={[styles.ownerEmail, { color: theme.colors.textSecondary }]}>
                                {item.owner_profile?.email || 'N/A'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.headerRight}>
                            <Chip
                                mode="flat"
                                style={[
                                    styles.statusChip,
                                    {
                                        backgroundColor:
                                            item.status === 'active' ? '#10B98120' : '#EF444420',
                                    },
                                ]}
                                textStyle={{
                                    color: item.status === 'active' ? '#10B981' : '#EF4444',
                                    fontSize: 11,
                                }}
                            >
                                {item.status === 'active' ? 'Active' : 'Inactive'}
                            </Chip>

                            <Menu
                                visible={isMenuOpen}
                                onDismiss={() => setMenuVisible(null)}
                                anchor={
                                    <IconButton
                                        icon="dots-vertical"
                                        iconColor={theme.colors.textSecondary}
                                        size={22}
                                        onPress={() => setMenuVisible(isMenuOpen ? null : item.id)}
                                    />
                                }
                                contentStyle={{ backgroundColor: theme.colors.surface }}
                            >
                                <Menu.Item
                                    onPress={() => { setMenuVisible(null); navigation.navigate('StoreDetails', { storeId: item.id }); }}
                                    title="View Details"
                                    leadingIcon="eye"
                                />
                                <Menu.Item
                                    onPress={() => { setMenuVisible(null); navigation.navigate('EditStore', { storeId: item.id, initialData: item }); }}
                                    title="Edit Store"
                                    leadingIcon="pencil"
                                />
                                <Divider />
                                <Menu.Item
                                    onPress={() => { setMenuVisible(null); toggleStoreStatus(item.id, item.status); }}
                                    title={item.status === 'active' ? 'Deactivate' : 'Activate'}
                                    leadingIcon={item.status === 'active' ? 'toggle-switch-off' : 'toggle-switch'}
                                />
                                <Divider />
                                <Menu.Item
                                    onPress={() => { setMenuVisible(null); handleResetPassword(item); }}
                                    title="Reset Password"
                                    leadingIcon="lock-reset"
                                />
                                <Menu.Item
                                    onPress={() => { setMenuVisible(null); handleResendCredentials(item); }}
                                    title="Resend Credentials Email"
                                    leadingIcon="email-fast"
                                />
                                <Divider />
                                <Menu.Item
                                    onPress={() => { setMenuVisible(null); handleDeleteStore(item); }}
                                    title="Delete Store"
                                    leadingIcon="delete"
                                    titleStyle={{ color: '#EF4444' }}
                                />
                            </Menu>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <Button
                            mode="outlined"
                            onPress={() => navigation.navigate('EditStore', { storeId: item.id, initialData: item })}
                            style={[styles.actionButton, { borderColor: theme.colors.primary }]}
                            labelStyle={{ color: theme.colors.primary, fontSize: 12 }}
                            icon="pencil"
                            compact
                        >
                            Edit
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => handleResendCredentials(item)}
                            style={[styles.actionButton, { borderColor: '#F59E0B' }]}
                            labelStyle={{ color: '#F59E0B', fontSize: 12 }}
                            icon="email-fast"
                            compact
                            loading={resettingPassword === item.id}
                            disabled={resettingPassword === item.id}
                        >
                            Resend Pwd
                        </Button>
                        <Button
                            mode="contained"
                            onPress={() => navigation.navigate('StoreDetails', { storeId: item.id })}
                            style={styles.actionButton}
                            buttonColor={theme.colors.primary}
                            textColor="white"
                            labelStyle={{ fontSize: 12 }}
                            icon="eye"
                            compact
                        >
                            View
                        </Button>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {selectionMode ? (
                <View style={[styles.bulkActionsBar, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.bulkActionsLeft}>
                        <Checkbox
                            status={selectedStores.size === filteredStores.length && filteredStores.length > 0 ? 'checked' : selectedStores.size > 0 ? 'indeterminate' : 'unchecked'}
                            onPress={toggleSelectAll}
                            color={theme.colors.primary}
                        />
                        <Text style={[styles.selectedCount, { color: theme.colors.text }]}>
                            {selectedStores.size} selected
                        </Text>
                    </View>
                    <View style={styles.bulkActionsRight}>
                        <Button
                            mode="contained"
                            onPress={handleBulkDelete}
                            buttonColor="#EF4444"
                            textColor="white"
                            icon="delete"
                            disabled={selectedStores.size === 0}
                            style={styles.bulkDeleteButton}
                        >
                            Delete ({selectedStores.size})
                        </Button>
                        <IconButton
                            icon="close"
                            iconColor={theme.colors.text}
                            onPress={cancelSelection}
                        />
                    </View>
                </View>
            ) : (
                <View style={[styles.topBar, { backgroundColor: theme.colors.surface }]}>
                    <Searchbar
                        placeholder="Search stores, owners..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={[styles.searchBar, { backgroundColor: theme.colors.background }]}
                        iconColor={theme.colors.primary}
                        placeholderTextColor={theme.colors.textSecondary}
                        inputStyle={{ color: theme.colors.text }}
                    />
                    <IconButton
                        icon="checkbox-multiple-marked-outline"
                        iconColor={theme.colors.primary}
                        onPress={() => setSelectionMode(true)}
                        style={styles.selectModeButton}
                    />
                </View>
            )}

            <FlatList
                data={filteredStores}
                renderItem={renderStore}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadStores}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    stores === null ? (
                        <View style={styles.emptyContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                                Loading stores...
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={64} color={theme.colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No stores found</Text>
                            <View style={styles.emptyActions}>
                                <Button
                                    mode="contained"
                                    onPress={() => navigation.navigate('AddStoreOwner')}
                                    style={styles.emptyButton}
                                    buttonColor={theme.colors.primary}
                                >
                                    Add Your First Store
                                </Button>
                                <Button
                                    mode="outlined"
                                    onPress={loadStores}
                                    style={[styles.emptyButton, { borderColor: theme.colors.primary }]}
                                    textColor={theme.colors.primary}
                                >
                                    Reload List
                                </Button>
                            </View>
                        </View>
                    )
                }
            />

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="white"
                onPress={() => navigation.navigate('AddStoreOwner')}
                label="Add Store"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    searchBar: {
        flex: 1,
        elevation: 2,
    },
    selectModeButton: {
        marginLeft: 5,
    },
    bulkActionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 8,
        elevation: 2,
    },
    bulkActionsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bulkActionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedCount: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    bulkDeleteButton: {
        marginRight: 5,
    },
    listContent: {
        padding: 10,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 12,
        elevation: 3,
        borderRadius: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    storeInfo: {
        flex: 1,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    storeName: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    storeNumber: {
        fontSize: 12,
        marginTop: 2,
    },
    ownerName: {
        fontSize: 13,
        marginTop: 4,
        fontWeight: '500',
    },
    ownerEmail: {
        fontSize: 12,
        marginTop: 1,
    },
    statusChip: {
        height: 26,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 6,
    },
    actionButton: {
        flex: 1,
        borderRadius: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 10,
    },
    emptyActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    emptyButton: {
        borderRadius: 8,
    },
});
