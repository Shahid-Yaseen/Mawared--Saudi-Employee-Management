import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Card, Chip, Searchbar, Button, Menu } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

export default function StoreManagementScreen({ navigation }: any) {
    const [stores, setStores] = useState<any[]>([]);
    const [filteredStores, setFilteredStores] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStores();
    }, []);

    useEffect(() => {
        const filtered = stores.filter(
            (store) =>
                store.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                store.store_number?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredStores(filtered);
    }, [searchQuery, stores]);

    const loadStores = async () => {
        try {
            const { data, error } = await supabase
                .from('stores')
                .select(`
          *,
          profiles!inner(full_name, email)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStores(data || []);
        } catch (error) {
            console.error('Error loading stores:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const toggleStoreStatus = async (storeId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        try {
            const { error } = await supabase
                .from('stores')
                .update({ status: newStatus })
                .eq('id', storeId);

            if (error) throw error;

            Alert.alert('Success', `Store ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            loadStores();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const renderStore = ({ item }: any) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{item.store_name}</Text>
                        <Text style={styles.storeNumber}>{item.store_number}</Text>
                        <Text style={styles.ownerName}>Owner: {item.profiles.full_name}</Text>
                    </View>
                    <Chip
                        mode="flat"
                        style={[
                            styles.statusChip,
                            {
                                backgroundColor:
                                    item.status === 'active' ? Colors.success + '20' : Colors.error + '20',
                            },
                        ]}
                        textStyle={{
                            color: item.status === 'active' ? Colors.success : Colors.error,
                        }}
                    >
                        {item.status}
                    </Chip>
                </View>

                <View style={styles.details}>
                    {item.location && (
                        <View style={styles.detailRow}>
                            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                            <Text style={styles.detailText}>{item.location}</Text>
                        </View>
                    )}
                    <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{item.profiles.email}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={() => toggleStoreStatus(item.id, item.status)}
                        style={styles.actionButton}
                    >
                        {item.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('StoreDetails', { storeId: item.id })}
                        style={styles.actionButton}
                    >
                        View Details
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search stores..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
            />

            <FlatList
                data={filteredStores}
                renderItem={renderStore}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStores} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="business-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No stores found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
        color: Colors.text,
    },
    storeNumber: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    ownerName: {
        fontSize: 13,
        color: Colors.primary,
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
        color: Colors.textSecondary,
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
        color: Colors.textSecondary,
        marginTop: 10,
    },
});
