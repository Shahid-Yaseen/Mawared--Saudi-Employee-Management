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
    Platform,
} from 'react-native';
import { Card, Chip, Searchbar, Button, Avatar, Modal, Portal, Checkbox, FAB } from 'react-native-paper';
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

// Cross-platform alert helpers
function showAlert(title: string, message: string, onOk?: () => void) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        onOk?.();
    } else {
        Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
}

function showConfirm(title: string, message: string, onConfirm: () => void, confirmText = 'Confirm') {
    if (Platform.OS === 'web') {
        if (window.confirm(`${title}\n\n${message}`)) {
            onConfirm();
        }
    } else {
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: confirmText, style: 'destructive', onPress: onConfirm },
        ]);
    }
}

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

    // Selection mode for bulk delete
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
            showAlert('Error', 'Failed to load users. Please try again.');
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    const getRoleColor = (role: string) => ROLE_COLORS[role] || theme.colors.textSecondary;
    const getRoleLabel = (role: string) => ROLE_LABELS[role] || role;

    const getInitials = (name: string | null) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // --- Selection helpers ---
    const toggleSelection = (userId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    // --- Actions ---
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
            showAlert('Success', `Role updated to ${getRoleLabel(newRole)}`);
            await loadUsers();
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to update role');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = (user: any) => {
        showConfirm(
            'Reset Password',
            `Are you sure you want to reset the password for ${user.full_name || user.email}?`,
            async () => {
                setActionLoading(user.id + '_password');
                try {
                    await adminApi.resetUserPassword(user.id, user.email, user.full_name || '');
                    showAlert('Success', 'Password reset email has been sent.');
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to reset password');
                } finally {
                    setActionLoading(null);
                }
            },
            'Reset'
        );
    };

    const handleToggleStatus = (user: any) => {
        const isBanned = user.banned || user.is_banned;
        const action = isBanned ? 'activate' : 'deactivate';

        showConfirm(
            `${isBanned ? 'Activate' : 'Deactivate'} User`,
            `Are you sure you want to ${action} ${user.full_name || user.email}?`,
            async () => {
                setActionLoading(user.id + '_status');
                try {
                    await adminApi.toggleUserStatus(user.id, !isBanned);
                    showAlert('Success', `User has been ${isBanned ? 'activated' : 'deactivated'}.`);
                    await loadUsers();
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to update user status');
                } finally {
                    setActionLoading(null);
                }
            },
            isBanned ? 'Activate' : 'Deactivate'
        );
    };

    const handleDeleteUser = (user: any) => {
        showConfirm(
            'Delete User',
            `Are you sure you want to permanently delete "${user.full_name || user.email}"?\n\n${user.role === 'store_owner' ? 'This will also delete their stores and all associated employees.\n\n' : ''}This action cannot be undone.`,
            async () => {
                setActionLoading(user.id + '_delete');
                try {
                    await adminApi.deleteUser(user.id);
                    showAlert('Deleted', `User "${user.full_name || user.email}" has been deleted.`);
                    await loadUsers();
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete user');
                } finally {
                    setActionLoading(null);
                }
            },
            'Delete'
        );
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) {
            showAlert('No Selection', 'Please select at least one user to delete.');
            return;
        }

        const count = selectedIds.size;
        showConfirm(
            'Bulk Delete Users',
            `Are you sure you want to permanently delete ${count} user${count > 1 ? 's' : ''}?\n\nStore owners will have their stores and employees deleted too.\n\nThis action cannot be undone.`,
            async () => {
                setActionLoading('bulk_delete');
                try {
                    const result = await adminApi.bulkDeleteUsers(Array.from(selectedIds));
                    showAlert('Bulk Delete Complete', result.message || `Deleted ${result.deleted} user(s).`);
                    exitSelectionMode();
                    await loadUsers();
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete users');
                } finally {
                    setActionLoading(null);
                }
            },
            'Delete All'
        );
    };

    // --- Render helpers ---
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

    const renderSelectionBar = () => {
        if (!selectionMode) return null;
        const allSelected = selectedIds.size === filteredUsers.length && filteredUsers.length > 0;
        return (
            <View style={[styles.selectionBar, { backgroundColor: theme.colors.primary + '15' }]}>
                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
                    <Checkbox
                        status={allSelected ? 'checked' : selectedIds.size > 0 ? 'indeterminate' : 'unchecked'}
                        onPress={toggleSelectAll}
                        color={theme.colors.primary}
                    />
                    <Text style={[styles.selectionText, { color: theme.colors.text }]}>
                        {selectedIds.size} selected
                    </Text>
                </TouchableOpacity>
                <View style={styles.selectionActions}>
                    <Button
                        mode="contained"
                        compact
                        onPress={handleBulkDelete}
                        loading={actionLoading === 'bulk_delete'}
                        disabled={selectedIds.size === 0 || !!actionLoading}
                        buttonColor="#EF4444"
                        textColor="white"
                        icon="delete"
                        style={{ borderRadius: 8 }}
                    >
                        Delete ({selectedIds.size})
                    </Button>
                    <Button
                        mode="outlined"
                        compact
                        onPress={exitSelectionMode}
                        style={{ borderRadius: 8, marginLeft: 8, borderColor: theme.colors.outline }}
                        labelStyle={{ color: theme.colors.text }}
                    >
                        Cancel
                    </Button>
                </View>
            </View>
        );
    };

    const renderUser = ({ item }: any) => {
        const isBanned = item.banned || item.is_banned;
        const roleColor = getRoleColor(item.role);
        const isLoadingRole = actionLoading === item.id + '_role';
        const isLoadingPassword = actionLoading === item.id + '_password';
        const isLoadingStatus = actionLoading === item.id + '_status';
        const isLoadingDelete = actionLoading === item.id + '_delete';
        const isSelected = selectedIds.has(item.id);

        return (
            <Card
                style={[
                    styles.card,
                    { backgroundColor: theme.colors.surface },
                    isBanned && styles.cardBanned,
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
                ]}
                onLongPress={() => {
                    if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedIds(new Set([item.id]));
                    }
                }}
            >
                <Card.Content>
                    <View style={styles.cardHeader}>
                        {selectionMode && (
                            <Checkbox
                                status={isSelected ? 'checked' : 'unchecked'}
                                onPress={() => toggleSelection(item.id)}
                                color={theme.colors.primary}
                            />
                        )}
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

                    {!selectionMode && (
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
                            <Button
                                mode="outlined"
                                compact
                                onPress={() => handleDeleteUser(item)}
                                loading={isLoadingDelete}
                                disabled={!!actionLoading}
                                icon={({ size, color }) => (
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                )}
                                style={[styles.actionButton, { borderColor: '#EF4444' }]}
                                labelStyle={[styles.actionButtonLabel, { color: '#EF4444' }]}
                            >
                                Delete
                            </Button>
                        </View>
                    )}
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
            {renderSelectionBar()}

            <View style={styles.resultsRow}>
                <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                </Text>
                {!selectionMode && filteredUsers.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSelectionMode(true)}
                        style={[styles.selectModeBtn, { borderColor: theme.colors.outline }]}
                    >
                        <Ionicons name="checkbox-outline" size={16} color={theme.colors.primary} />
                        <Text style={[styles.selectModeBtnText, { color: theme.colors.primary }]}>Select</Text>
                    </TouchableOpacity>
                )}
            </View>

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
    resultsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    resultsCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    selectModeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
    },
    selectModeBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    selectionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    selectAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    selectionActions: {
        flexDirection: 'row',
        alignItems: 'center',
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
        flexWrap: 'wrap',
    },
    actionButton: {
        borderRadius: 8,
        minWidth: 80,
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
