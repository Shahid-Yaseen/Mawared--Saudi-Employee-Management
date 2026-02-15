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
import { Card, FAB, Searchbar, Chip, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';


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

    useFocusEffect(
        useCallback(() => {
            console.log('EmployeesScreen focused, loading employees...');
            loadData();
        }, [filterStatus])
    );

    const loadData = async () => {
        if (!refreshing) setLoading(true);
        try {
            console.log('API CALL: getEmployees starting...');
            // The API will automatically detect the user's store if we don't pass an ID
            const result = await adminApi.getEmployees();
            console.log('API RESULT: getEmployees success:', result.success, 'Count:', result.employees?.length);

            if (result.success) {
                setEmployees(result.employees || []);
            }
        } catch (error) {
            console.error('API ERROR: loading employees failed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const toggleEmployeeStatus = async (employeeId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
            const result = await adminApi.toggleEmployeeStatus(employeeId, newStatus);
            if (result.success) {
                loadData();
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update status');
        }
    };

    const handleResetPassword = async (item: any) => {
        const resetAction = async () => {
            try {
                setLoading(true);
                const result = await adminApi.resetEmployeePassword(item.id);
                if (result.success) {
                    Alert.alert('Success', `Password reset instructions sent to ${item.profiles?.email}`);
                }
            } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to reset password');
            } finally {
                setLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to reset password for this employee?')) {
                resetAction();
            }
        } else {
            Alert.alert(
                'Reset Password',
                'Are you sure you want to reset password for this employee?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: resetAction }
                ]
            );
        }
    };

    const filteredEmployees = employees.filter((emp) =>
        emp.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return theme.colors.success;
            case 'on_leave': return theme.colors.warning;
            case 'suspended': return theme.colors.error;
            case 'terminated': return theme.colors.textSecondary;
            default: return theme.colors.textSecondary;
        }
    };

    const renderEmployee = ({ item }: any) => (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
                <View style={styles.employeeHeader}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EmployeeDetails', { employeeId: item.id })}
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
                        <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.department}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('profile.position')}</Text>
                        <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.position}</Text>
                    </View>
                </View>

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
                        style={[styles.actionButton, { borderColor: theme.colors.error }]}
                        labelStyle={{ color: theme.colors.error, fontSize: 11 }}
                    >
                        Rest Pass
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
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {isLargeScreen && (
                <View style={{ padding: Spacing.lg, paddingBottom: 0 }}>
                    <Text style={{ ...Typography.h3, fontWeight: '800', color: theme.colors.text }}>{t('employees.title')}</Text>
                </View>
            )}
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
                    <Chip
                        selected={filterStatus === null}
                        onPress={() => {
                            setFilterStatus(null);
                            loadData();
                        }}
                        style={styles.filterChip}
                        selectedColor={theme.colors.primary}
                    >
                        All
                    </Chip>
                    <Chip
                        selected={filterStatus === 'active'}
                        onPress={() => {
                            setFilterStatus('active');
                            loadData();
                        }}
                        style={styles.filterChip}
                        selectedColor={theme.colors.primary}
                    >
                        {t('employees.active')}
                    </Chip>
                    <Chip
                        selected={filterStatus === 'on_leave'}
                        onPress={() => {
                            setFilterStatus('on_leave');
                            loadData();
                        }}
                        style={styles.filterChip}
                        selectedColor={theme.colors.primary}
                    >
                        {t('employees.onLeave')}
                    </Chip>
                </View>
            </View>

            <FlatList
                data={filteredEmployees}
                renderItem={renderEmployee}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
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

            <FAB
                icon="plus"
                label={t('employees.addEmployee')}
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="#FFFFFF"
                onPress={() => navigation.navigate('AddEmployee')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
