import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Card, Chip, Searchbar, Button, Avatar, Modal, Portal } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';
import { adminApi } from '../../services/adminApi';

const ROLES = ['All', 'store_owner', 'hr_team', 'employee', 'super_admin'];

const ROLE_COLORS: Record<string, string> = {
    store_owner: '#D4AF37',
    hr_team: '#F59E0B',
    employee: '#10B981',
    super_admin: '#EF4444',
};

const ROLE_LABELS: Record<string, string> = {
    store_owner: 'Store Owner',
    hr_team: 'HR Team',
    employee: 'Employee',
    super_admin: 'Super Admin',
};

export default function UserManagementScreen() {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('All');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        let filtered = users;

        if (selectedRole !== 'All') {
            filtered = filtered.filter((user) => user.role === selectedRole);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (user) =>
                    user.full_name?.toLowerCase().includes(query) ||
                    user.email?.toLowerCase().includes(query)
            );
        }

        setFilteredUsers(filtered);
    }, [searchQuery, users, selectedRole]);

    const loadUsers = async () => {
        try {
            setRefreshing(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
            Alert.alert('Error', 'Failed to load users. Please try again.');
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    const getRoleColor = (role: string) => {
        return ROLE_COLORS[role] || Colors.textSecondary;
    };

    const getRoleLabel = (role: string) => {
        return ROLE_LABELS[role] || role;
    };

    const getInitials = (name: string | null) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleChangeRole = (user: any) => {
        setSelectedUser(user);
        setRoleModalVisible(true);
    };

    const confirmRoleChange = async (newRole: string) => {
        if (!selectedUser || newRole === selectedUser.role) {
            setRoleModalVisible(false);
            return;
        }

        setRoleModalVisible(false);
        setActionLoading(selectedUser.id + '_role');

        try {
            await adminApi.updateUserRole(selectedUser.id, newRole);
            Alert.alert('Success', `Role updated to ${getRoleLabel(newRole)}`);
            await loadUsers();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update role');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = (user: any) => {
        Alert.alert(
            'Reset Password',
            `Are you sure you want to reset the password for ${user.full_name || user.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(user.id + '_password');
                        try {
                            await adminApi.resetUserPassword(user.id, user.email, user.full_name || '');
                            Alert.alert('Success', 'Password reset email has been sent.');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to reset password');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleToggleStatus = (user: any) => {
        const isBanned = user.banned || user.is_banned;
        const action = isBanned ? 'activate' : 'deactivate';

        Alert.alert(
            `${isBanned ? 'Activate' : 'Deactivate'} User`,
            `Are you sure you want to ${action} ${user.full_name || user.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isBanned ? 'Activate' : 'Deactivate',
                    style: isBanned ? 'default' : 'destructive',
                    onPress: async () => {
                        setActionLoading(user.id + '_status');
                        try {
                            await adminApi.toggleUserStatus(user.id, !isBanned);
                            Alert.alert('Success', `User has been ${isBanned ? 'activated' : 'deactivated'}.`);
                            await loadUsers();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to update user status');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const renderRoleFilter = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={styles.filterContent}
        >
            {ROLES.map((role) => {
                const isSelected = selectedRole === role;
                const chipColor = role === 'All' ? Colors.primary : getRoleColor(role);
                return (
                    <Chip
                        key={role}
                        mode={isSelected ? 'flat' : 'outlined'}
                        selected={isSelected}
                        onPress={() => setSelectedRole(role)}
                        style={[
                            styles.filterChip,
                            isSelected && { backgroundColor: chipColor + '20' },
                        ]}
                        textStyle={[
                            styles.filterChipText,
                            isSelected && { color: chipColor },
                        ]}
                        selectedColor={chipColor}
                    >
                        {role === 'All' ? 'All' : getRoleLabel(role)}
                    </Chip>
                );
            })}
        </ScrollView>
    );

    const renderUser = ({ item }: any) => {
        const isBanned = item.banned || item.is_banned;
        const roleColor = getRoleColor(item.role);
        const isLoadingRole = actionLoading === item.id + '_role';
        const isLoadingPassword = actionLoading === item.id + '_password';
        const isLoadingStatus = actionLoading === item.id + '_status';

        return (
            <Card style={[styles.card, isBanned && styles.cardBanned]}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <Avatar.Text
                            size={50}
                            label={getInitials(item.full_name)}
                            style={{ backgroundColor: roleColor }}
                            labelStyle={{ color: Colors.white }}
                        />
                        <View style={styles.userInfo}>
                            <View style={styles.nameRow}>
                                <Text style={styles.userName}>{item.full_name || 'Unknown'}</Text>
                                {isBanned && (
                                    <Chip
                                        mode="flat"
                                        style={styles.bannedChip}
                                        textStyle={styles.bannedChipText}
                                    >
                                        Inactive
                                    </Chip>
                                )}
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} />
                                <Text style={styles.userEmail}>{item.email}</Text>
                            </View>
                            {item.phone && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.userPhone}>{item.phone}</Text>
                                </View>
                            )}
                        </View>
                        <Chip
                            mode="flat"
                            style={[styles.roleChip, { backgroundColor: roleColor + '20' }]}
                            textStyle={{ color: roleColor, fontSize: 11, fontWeight: '600' }}
                        >
                            {getRoleLabel(item.role)}
                        </Chip>
                    </View>

                    <View style={styles.details}>
                        <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.detailText}>
                                Joined: {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionButtons}>
                        <Button
                            mode="outlined"
                            compact
                            onPress={() => handleChangeRole(item)}
                            loading={isLoadingRole}
                            disabled={!!actionLoading}
                            icon={({ size, color }) => (
                                <MaterialCommunityIcons name="account-convert" size={16} color={color} />
                            )}
                            style={styles.actionButton}
                            labelStyle={styles.actionButtonLabel}
                        >
                            Role
                        </Button>
                        <Button
                            mode="outlined"
                            compact
                            onPress={() => handleResetPassword(item)}
                            loading={isLoadingPassword}
                            disabled={!!actionLoading}
                            icon={({ size, color }) => (
                                <MaterialCommunityIcons name="lock-reset" size={16} color={color} />
                            )}
                            style={styles.actionButton}
                            labelStyle={styles.actionButtonLabel}
                        >
                            Reset
                        </Button>
                        <Button
                            mode="outlined"
                            compact
                            onPress={() => handleToggleStatus(item)}
                            loading={isLoadingStatus}
                            disabled={!!actionLoading}
                            icon={({ size, color }) => (
                                <Ionicons
                                    name={isBanned ? 'checkmark-circle-outline' : 'ban-outline'}
                                    size={16}
                                    color={isBanned ? Colors.success : Colors.error}
                                />
                            )}
                            style={[
                                styles.actionButton,
                                { borderColor: isBanned ? Colors.success : Colors.error },
                            ]}
                            labelStyle={[
                                styles.actionButtonLabel,
                                { color: isBanned ? Colors.success : Colors.error },
                            ]}
                        >
                            {isBanned ? 'Activate' : 'Deactivate'}
                        </Button>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    const renderRoleModal = () => (
        <Portal>
            <Modal
                visible={roleModalVisible}
                onDismiss={() => setRoleModalVisible(false)}
                contentContainerStyle={styles.modalContainer}
            >
                <Text style={styles.modalTitle}>Change Role</Text>
                {selectedUser && (
                    <Text style={styles.modalSubtitle}>
                        {selectedUser.full_name || selectedUser.email}
                    </Text>
                )}
                <View style={styles.roleOptions}>
                    {['store_owner', 'hr_team', 'employee', 'super_admin'].map((role) => {
                        const isCurrentRole = selectedUser?.role === role;
                        const roleColor = getRoleColor(role);
                        return (
                            <TouchableOpacity
                                key={role}
                                style={[
                                    styles.roleOption,
                                    isCurrentRole && { backgroundColor: roleColor + '15', borderColor: roleColor },
                                ]}
                                onPress={() => confirmRoleChange(role)}
                                disabled={isCurrentRole}
                            >
                                <View style={[styles.roleIndicator, { backgroundColor: roleColor }]} />
                                <Text style={[styles.roleOptionText, isCurrentRole && { fontWeight: '700' }]}>
                                    {getRoleLabel(role)}
                                </Text>
                                {isCurrentRole && (
                                    <Ionicons name="checkmark-circle" size={20} color={roleColor} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <Button
                    mode="outlined"
                    onPress={() => setRoleModalVisible(false)}
                    style={styles.modalCancelButton}
                >
                    Cancel
                </Button>
            </Modal>
        </Portal>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading users...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search by name or email..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
                iconColor={Colors.textSecondary}
            />

            {renderRoleFilter()}

            <Text style={styles.resultsCount}>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </Text>

            <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadUsers}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No users found</Text>
                        <Text style={styles.emptySubtext}>
                            {searchQuery || selectedRole !== 'All'
                                ? 'Try adjusting your search or filters'
                                : 'No users registered yet'}
                        </Text>
                    </View>
                }
            />

            {renderRoleModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    searchBar: {
        margin: 12,
        elevation: 2,
        borderRadius: 8,
    },
    filterContainer: {
        maxHeight: 50,
    },
    filterContent: {
        paddingHorizontal: 12,
        gap: 8,
    },
    filterChip: {
        marginRight: 4,
    },
    filterChipText: {
        fontSize: 13,
    },
    resultsCount: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    listContent: {
        padding: 12,
        paddingTop: 4,
    },
    card: {
        marginBottom: 12,
        elevation: 2,
        borderRadius: 12,
    },
    cardBanned: {
        opacity: 0.7,
        borderLeftWidth: 3,
        borderLeftColor: Colors.error,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    bannedChip: {
        backgroundColor: Colors.error + '20',
        height: 22,
    },
    bannedChipText: {
        color: Colors.error,
        fontSize: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 6,
    },
    userEmail: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    userPhone: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    roleChip: {
        height: 28,
    },
    details: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '50',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        borderRadius: 8,
    },
    actionButtonLabel: {
        fontSize: 11,
        marginVertical: 2,
    },
    modalContainer: {
        backgroundColor: Colors.white,
        margin: 20,
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    roleOptions: {
        gap: 10,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 12,
    },
    roleIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    roleOptionText: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
    },
    modalCancelButton: {
        marginTop: 16,
        borderRadius: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 12,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
});
