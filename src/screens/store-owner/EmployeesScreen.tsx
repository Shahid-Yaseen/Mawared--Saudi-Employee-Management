import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    useWindowDimensions,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Card, FAB, Searchbar, Chip, Button, Checkbox, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

// Cross-platform alert helper
function showAlert(title: string, message: string, onOk?: () => void) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
        onOk?.();
    } else {
        Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
}

function showConfirm(title: string, message: string, onConfirm: () => void) {
    if (Platform.OS === 'web') {
        if (window.confirm(`${title}\n\n${message}`)) {
            onConfirm();
        }
    } else {
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', style: 'destructive', onPress: onConfirm },
        ]);
    }
}


export default function EmployeesScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

    // Selection / bulk mode
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useFocusEffect(
        useCallback(() => {
            console.log('EmployeesScreen focused, loading employees...');
            loadData();
        }, [filterStatus])
    );

    const loadData = async () => {
        if (!refreshing) setLoading(true);
        try {
            const result = await adminApi.getEmployees();
            if (result.success) {
                setEmployees(result.employees || []);
            }
        } catch (error) {
            console.error('Loading employees failed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            // Exit selection mode if nothing left
            if (next.size === 0) {
                setSelectionMode(false);
            }
            return next;
        });
    };

    const selectAll = () => {
        const allIds = new Set(filteredEmployees.map(e => e.id));
        setSelectedIds(allIds);
    };

    const toggleEmployeeStatus = async (employeeId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
            const result = await adminApi.toggleEmployeeStatus(employeeId, newStatus);
            if (result.success) {
                loadData();
            }
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to update status');
        }
    };

    const handleResetPassword = async (item: any) => {
        showConfirm(
            'Reset Password',
            'Are you sure you want to reset password for this employee?',
            async () => {
                try {
                    setLoading(true);
                    const result = await adminApi.resetEmployeePassword(item.id);
                    if (result.success) {
                        showAlert('Success', `Password reset for ${item.profiles?.full_name || item.profiles?.email || 'employee'}.${result.tempPassword ? `\n\nNew temporary password: ${result.tempPassword}` : ''}`);
                    }
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to reset password');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleDeleteEmployee = (item: any) => {
        showConfirm(
            'Delete Employee',
            `Are you sure you want to permanently delete ${item.profiles?.full_name || 'this employee'}? This action cannot be undone.`,
            async () => {
                try {
                    setLoading(true);
                    const result = await adminApi.deleteEmployee(item.id);
                    if (result.success) {
                        showAlert('Deleted', 'Employee has been deleted successfully.');
                        loadData();
                    }
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete employee');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        showConfirm(
            'Bulk Delete',
            `Are you sure you want to permanently delete ${selectedIds.size} employee(s)? This action cannot be undone.`,
            async () => {
                try {
                    setLoading(true);
                    const result = await adminApi.bulkDeleteEmployees(Array.from(selectedIds));
                    if (result.success) {
                        showAlert('Deleted', `${selectedIds.size} employee(s) deleted successfully.`);
                        exitSelectionMode();
                        loadData();
                    }
                } catch (error: any) {
                    showAlert('Error', error.message || 'Failed to delete employees');
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    const filteredEmployees = employees.filter((emp) => {
        const matchesSearch =
            emp.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.employee_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = !filterStatus || emp.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return theme.colors.success;
            case 'on_leave': return theme.colors.warning;
            case 'suspended': return theme.colors.error;
            case 'terminated': return theme.colors.textSecondary;
            default: return theme.colors.textSecondary;
        }
    };

    const renderEmployee = ({ item }: any) => {
        const isSelected = selectedIds.has(item.id);

        return (
            <Card
                style={[
                    styles.card,
                    { backgroundColor: theme.colors.surface },
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
                ]}
            >
                <Card.Content>
                    <View style={styles.employeeHeader}>
                        {selectionMode && (
                            <Checkbox
                                status={isSelected ? 'checked' : 'unchecked'}
                                onPress={() => toggleSelect(item.id)}
                                color={theme.colors.primary}
                            />
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                if (selectionMode) {
                                    toggleSelect(item.id);
                                } else {
                                    navigation.navigate('EmployeeDetails', { employeeId: item.id });
                                }
                            }}
                            onLongPress={() => {
                                if (!selectionMode) {
                                    setSelectionMode(true);
                                    setSelectedIds(new Set([item.id]));
                                }
                            }}
                            style={styles.employeeInfo}
                        >
                            <Text style={[styles.employeeName, { color: theme.colors.text }]}>
                                {item.profiles?.full_name || 'Unknown'}
                            </Text>
                            <Text style={[styles.employeeNumber, { color: theme.colors.textSecondary }]}>#{item.employee_number}</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {(item.profiles?.role === 'hr' || item.position?.includes('HR')) && (
                                <Chip
                                    style={{ backgroundColor: theme.colors.primary + '20', marginRight: 8 }}
                                    textStyle={{ color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' }}
                                >
                                    HR
                                </Chip>
                            )}
                            <Chip
                                style={[
                                    styles.statusChip,
                                    { backgroundColor: getStatusColor(item.status) + '20' },
                                ]}
                                textStyle={{ color: getStatusColor(item.status) }}
                            >
                                {item.status}
                            </Chip>
                        </View>
                    </View>

                    <View style={styles.employeeDetails}>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('profile.department')}</Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.department || '—'}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('profile.position')}</Text>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.position || '—'}</Text>
                        </View>
                    </View>

                    {!selectionMode && (
                        <View style={styles.actions}>
                            <Button
                                mode="outlined"
                                onPress={() => navigation.navigate('EditEmployee', { employeeId: item.id, initialData: item })}
                                style={[styles.actionButton, { borderColor: theme.colors.primary }]}
                                labelStyle={{ color: theme.colors.primary, fontSize: 11 }}
                            >
                                Edit
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => toggleEmployeeStatus(item.id, item.status)}
                                style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                                labelStyle={{ color: theme.colors.primary, fontSize: 11 }}
                            >
                                {item.status === 'active' ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => handleResetPassword(item)}
                                style={[styles.actionButton, { borderColor: theme.colors.warning || '#FF9800' }]}
                                labelStyle={{ color: theme.colors.warning || '#FF9800', fontSize: 11 }}
                            >
                                Reset Pass
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => handleDeleteEmployee(item)}
                                style={[styles.actionButton, { borderColor: theme.colors.error }]}
                                labelStyle={{ color: theme.colors.error, fontSize: 11 }}
                            >
                                Delete
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => navigation.navigate('EmployeeDetails', { employeeId: item.id })}
                                style={[styles.actionButton, { borderColor: theme.colors.primary }]}
                                labelStyle={{ color: theme.colors.primary, fontSize: 11 }}
                            >
                                Info
                            </Button>
                        </View>
                    )}
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Page title for large screens */}
            {isLargeScreen && (
                <View style={{ padding: Spacing.lg, paddingBottom: 0 }}>
                    <Text style={{ ...Typography.h3, fontWeight: '800', color: theme.colors.text }}>{t('employees.title')}</Text>
                </View>
            )}

            {/* Selection mode toolbar */}
            {selectionMode && (
                <View style={[styles.selectionBar, { backgroundColor: theme.colors.primary + '15', borderBottomColor: theme.colors.primary }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <IconButton icon="close" size={22} onPress={exitSelectionMode} iconColor={theme.colors.text} />
                        <Text style={[styles.selectionText, { color: theme.colors.text }]}>
                            {selectedIds.size} selected
                        </Text>
                        <Button
                            mode="text"
                            onPress={selectAll}
                            labelStyle={{ color: theme.colors.primary, fontSize: 13 }}
                        >
                            Select All
                        </Button>
                    </View>
                    <Button
                        mode="contained"
                        onPress={handleBulkDelete}
                        buttonColor={theme.colors.error}
                        textColor="#fff"
                        icon="delete"
                        style={{ borderRadius: 8 }}
                        labelStyle={{ fontSize: 13, fontWeight: '700' }}
                    >
                        Delete ({selectedIds.size})
                    </Button>
                </View>
            )}

            {/* Search & filter header */}
            <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.divider }]}>
                <Searchbar
                    placeholder={t('employees.searchPlaceholder')}
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    style={[styles.searchBar, { backgroundColor: theme.colors.background }]}
                    inputStyle={{ color: theme.colors.text }}
                    iconColor={theme.colors.textSecondary}
                />

                <View style={styles.filterContainer}>
                    {[
                        { key: null, label: 'All' },
                        { key: 'active', label: t('employees.active') },
                        { key: 'on_leave', label: t('employees.onLeave') },
                        { key: 'suspended', label: 'Suspended' },
                    ].map(f => (
                        <Chip
                            key={f.key ?? 'all'}
                            selected={filterStatus === f.key}
                            onPress={() => setFilterStatus(f.key)}
                            style={styles.filterChip}
                            selectedColor={theme.colors.primary}
                        >
                            {f.label}
                        </Chip>
                    ))}
                </View>
            </View>

            <FlatList
                data={filteredEmployees}
                renderItem={renderEmployee}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                extraData={selectedIds}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary, marginTop: 10 }]}>Loading employees...</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No employees found</Text>
                        </View>
                    )
                }
            />

            {!selectionMode && (
                <FAB
                    icon="plus"
                    label={t('employees.addEmployee')}
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    color="#FFFFFF"
                    onPress={() => navigation.navigate('AddEmployee')}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    selectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderBottomWidth: 2,
    },
    selectionText: {
        ...Typography.body,
        fontWeight: '700',
        marginRight: Spacing.sm,
    },
    header: {
        padding: Spacing.md,
    },
    searchBar: {
        marginBottom: Spacing.md,
        elevation: 0,
    },
    filterContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    filterChip: {
        marginRight: Spacing.xs,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    employeeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        ...Typography.h5,
    },
    employeeNumber: {
        ...Typography.caption,
    },
    statusChip: {
        height: 28,
    },
    employeeDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
    },
    detailValue: {
        ...Typography.body,
        fontWeight: '600',
    },
    emptyContainer: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
    },
    fab: {
        position: 'absolute',
        right: Spacing.md,
        bottom: Spacing.md,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 8,
        marginTop: Spacing.md,
        flexWrap: 'wrap',
    },
    actionButton: {
        height: 32,
        borderRadius: 4,
    },
});
