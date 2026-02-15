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
import { Card, Chip, Searchbar, Button, Menu, FAB } from 'react-native-paper';
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

    useFocusEffect(
        useCallback(() => {
            console.log('StoreManagementScreen focused, loading stores...');
            loadStores();
        }, [])
    );

    useEffect(() => {
        if (!stores) return;
        const filtered = stores.filter(
            (store) =>
                store.store_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                store.store_number?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredStores(filtered);
    }, [searchQuery, stores]);

    const loadStores = async () => {
        setRefreshing(true);
        try {
            console.log('API CALL: getStores starting...');
            const result = await adminApi.getStores();
            console.log('API RESULT: getStores success:', result.success, 'Count:', result.stores?.length);

            if (result.success) {
                setStores(result.stores || []);
            } else {
                Alert.alert('Error', result.error || 'Failed to fetch stores');
                setStores([]);
            }
        } catch (error: any) {
            console.error('API ERROR: getStores failed:', error);
            Alert.alert('Error', error.message || 'Failed to load stores');
            setStores([]);
        } finally {
            setRefreshing(false);
        }
    };

    const handleResetPassword = async (store: any) => {
        const owner = store.owner_profile;
        if (!owner) {
            Alert.alert('Error', 'Owner profile not found for this store');
            return;
        }

        Alert.alert(
            'Reset Password',
            `Are you sure you want to reset the password for ${owner.full_name}? A temporary password will be shown and sent to ${owner.email}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await adminApi.resetUserPassword(
                                owner.id,
                                owner.email,
                                owner.full_name
                            );

                            const msg = `Password reset successful!\n\nTemporary Password: ${result.tempPassword}\n\nEmail sent: ${result.success ? 'Yes' : 'No'}`;

                            if (Platform.OS === 'web') {
                                alert(msg);
                            } else {
                                Alert.alert('Success', msg);
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to reset password');
                        }
                    }
                }
            ]
        );
    };

    const toggleStoreStatus = async (storeId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        try {
            console.log(`Toggling store ${storeId} to ${newStatus}...`);
            await adminApi.toggleStoreStatus(storeId, newStatus);

            Alert.alert('Success', `Store ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
            loadStores();
        } catch (error: any) {
            console.error('Error toggling store status:', error);
            Alert.alert('Error', error.message || 'Failed to update store status');
        }
    };

    const renderStore = ({ item }: any) => (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={styles.storeInfo}>
                        <Text style={[styles.storeName, { color: theme.colors.text }]}>{item.store_name}</Text>
                        <Text style={[styles.storeNumber, { color: theme.colors.textSecondary }]}>{item.store_number}</Text>
                        <Text style={[styles.ownerName, { color: theme.colors.primary }]}>Owner: {item.owner_profile?.full_name || 'Unknown'}</Text>
                    </View>
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
                        }}
                    >
                        {item.status}
                    </Chip>
                </View>

                <View style={styles.details}>
                    {item.location && (
                        <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.location}</Text>
                        </View>
                    )}
                    <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.owner_profile?.email || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('EditStore', { storeId: item.id, initialData: item })}
                        style={[styles.actionButton, { borderColor: theme.colors.primary }]}
                        labelStyle={{ color: theme.colors.primary, fontSize: 11 }}
                    >
                        Edit
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => toggleStoreStatus(item.id, item.status)}
                        style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                        labelStyle={{ color: theme.colors.primary, fontSize: 11 }}
                    >
                        {item.status === 'active' ? 'Off' : 'On'}
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => handleResetPassword(item)}
                        style={[styles.actionButton, { borderColor: theme.colors.error }]}
                        labelStyle={{ color: theme.colors.error, fontSize: 11 }}
                    >
                        Reset
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('StoreDetails', { storeId: item.id })}
                        style={styles.actionButton}
                        buttonColor={theme.colors.primary}
                        textColor="white"
                        labelStyle={{ fontSize: 11 }}
                    >
                        Info
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Searchbar
                placeholder="Search stores..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                iconColor={theme.colors.primary}
                placeholderTextColor={theme.colors.textSecondary}
                inputStyle={{ color: theme.colors.text }}
            />

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
    searchBar: {
        margin: 10,
        elevation: 2,
    },
    listContent: {
        padding: 10,
    },
    card: {
        marginBottom: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    storeInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    storeNumber: {
        fontSize: 12,
        marginTop: 2,
    },
    ownerName: {
        fontSize: 13,
        marginTop: 4,
    },
    statusChip: {
        height: 28,
    },
    details: {
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 13,
        marginLeft: 8,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 8,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 4,
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
