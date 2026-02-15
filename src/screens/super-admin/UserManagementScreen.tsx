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
import { Card, Chip, Searchbar, Button, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

export default function UserManagementScreen() {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        const filtered = users.filter(
            (user) =>
                user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    const loadUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const getRoleColor = (role: string) => {
        const colors: any = {
            store_owner: Colors.primary,
            employee: Colors.success,
            hr: Colors.warning,
            admin: Colors.error,
        };
        return colors[role] || Colors.textSecondary;
    };

    const renderUser = ({ item }: any) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Avatar.Text
                        size={50}
                        label={item.full_name?.substring(0, 2).toUpperCase() || 'U'}
                        style={{ backgroundColor: getRoleColor(item.role) }}
                    />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.full_name || 'Unknown'}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
                    </View>
                    <Chip
                        mode="flat"
                        style={[styles.roleChip, { backgroundColor: getRoleColor(item.role) + '20' }]}
                        textStyle={{ color: getRoleColor(item.role) }}
                    >
                        {item.role}
                    </Chip>
                </View>

                <View style={styles.details}>
                    <Text style={styles.detailText}>
                        Created: {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search users..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
            />

            <Text style={styles.resultsCount}>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </Text>

            <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadUsers} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No users found</Text>
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
    resultsCount: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        fontSize: 14,
        color: Colors.textSecondary,
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
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    userEmail: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    userPhone: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    roleChip: {
        height: 28,
    },
    details: {
        marginTop: 10,
    },
    detailText: {
        fontSize: 12,
        color: Colors.textSecondary,
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
