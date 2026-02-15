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
import { useTheme } from '../../store/ThemeContext';
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
    const { theme } = useTheme();
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
        return ROLE_COLORS[role] || theme.colors.textSecondary;
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
        <View style={styles.filterOuterContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {ROLES.map((role) => {
                    const isSelected = selectedRole === role;
                    const chipColor = role === 'All' ? theme.colors.primary : getRoleColor(role);
                    return (
                        <Chip
                            key={role}
                            mode={isSelected ? 'flat' : 'outlined'}
                            selected={isSelected}
                            onPress={() => setSelectedRole(role)}
                            style={[
                                styles.filterChip,
                                {
                                    borderColor: isSelected ? chipColor : theme.colors.divider,
                                    backgroundColor: isSelected ? chipColor + '15' : theme.colors.surface,
                                },
                            ]}
                            textStyle={[
                                styles.filterChipText,
                                {
                                    color: isSelected ? chipColor : theme.colors.text,
                                    fontWeight: isSelected ? '700' : '400',
                                },
                            ]}
                            showSelectedOverlay
                        >
                            {role === 'All' ? 'All Roles' : getRoleLabel(role)}
                        </Chip>
                    );
                })}
            </ScrollView>
        </View>
    );

    const renderUser = ({ item }: any) => {
        const isBanned = item.banned || item.is_banned;
        const roleColor = getRoleColor(item.role);
        const isLoadingRole = actionLoading === item.id + '_role';
        const isLoadingPassword = actionLoading === item.id + '_password';
        const isLoadingStatus = actionLoading === item.id + '_status';

        return (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }, isBanned && styles.cardBanned]}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <Avatar.Text
                            size={50}
                            label={getInitials(item.full_name)}
                            style={{ backgroundColor: roleColor }}
                            labelStyle={{ color: 'white' }}
                        />
                        <View style={styles.userInfo}>
                            <View style={styles.nameRow}>
                                <Text style={[styles.userName, { color: theme.colors.text }]}>{item.full_name || 'Unknown'}</Text>
                                {isBanned && (
                                    <Chip
                                        mode="flat"
                                        style={[styles.bannedChip, { backgroundColor: '#EF444420' }]}
                                        textStyle={{ color: '#EF4444', fontSize: 10 }}
                                    >
                                        Inactive
                                    </Chip>
                                )}
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={14} color={theme.colors.textSecondary} />
                                <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{item.email}</Text>
                            </View>
                            {item.phone && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
                                    <Text style={[styles.userPhone, { color: theme.colors.textSecondary }]}>{item.phone}</Text>
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

                    <View style={[styles.details, { borderTopColor: theme.colors.divider }]}>
                        <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
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
                            style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                            labelStyle={[styles.actionButtonLabel, { color: theme.colors.primary }]}
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
                            style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                            labelStyle={[styles.actionButtonLabel, { color: theme.colors.primary }]}
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
                                    color={isBanned ? '#10B981' : '#EF4444'}
                                />
                            )}
                            style={[
                                styles.actionButton,
                                { borderColor: isBanned ? '#10B981' : '#EF4444' },
                            ]}
                            labelStyle={[
                                styles.actionButtonLabel,
                                { color: isBanned ? '#10B981' : '#EF4444' },
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
                contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            >
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Change Role</Text>
                {selectedUser && (
                    <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
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
                                    { borderColor: theme.colors.outline },
                                    isCurrentRole && { backgroundColor: roleColor + '15', borderColor: roleColor },
                                ]}
                                onPress={() => confirmRoleChange(role)}
                                disabled={isCurrentRole}
                            >
                                <View style={[styles.roleIndicator, { backgroundColor: roleColor }]} />
                                <Text style={[styles.roleOptionText, { color: theme.colors.text }, isCurrentRole && { fontWeight: '700' }]}>
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
                    style={[styles.modalCancelButton, { borderColor: theme.colors.outline }]}
                >
                    Cancel
                </Button>
            </Modal>
        </Portal>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading users...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Searchbar
                placeholder="Search by name or email..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                iconColor={theme.colors.textSecondary}
                placeholderTextColor={theme.colors.textSecondary}
                inputStyle={{ color: theme.colors.text }}
            />

            {renderRoleFilter()}

            <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
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
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No users found</Text>
                        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
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
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    searchBar: {
        margin: 12,
        elevation: 2,
        borderRadius: 8,
    },
    filterOuterContainer: {
        backgroundColor: 'transparent',
        marginBottom: 8,
    },
    filterContainer: {
        maxHeight: 60,
    },
    filterContent: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        flexDirection: 'row',
    },
    filterChip: {
        marginRight: 8,
        height: 36,
        justifyContent: 'center',
    },
    filterChipText: {
        fontSize: 13,
    },
    resultsCount: {
        paddingHorizontal: 16,
        paddingVertical: 4,
        fontSize: 12,
        fontWeight: '600',
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
        borderLeftColor: '#EF4444',
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
    },
    bannedChip: {
        height: 22,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
        gap: 6,
    },
    userEmail: {
        fontSize: 13,
    },
    userPhone: {
        fontSize: 12,
    },
    roleChip: {
        height: 28,
    },
    details: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
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
        margin: 20,
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
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
        marginTop: 12,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 13,
        marginTop: 4,
    },
});
