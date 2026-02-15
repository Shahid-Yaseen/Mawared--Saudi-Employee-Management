import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { Card, FAB, Searchbar, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import SidebarLayout from '../../components/SidebarLayout';

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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: storeData } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (storeData) {
                let query = supabase
                    .from('employees')
                    .select('*, profiles(full_name, email, phone)')
                    .eq('store_id', storeData.id);

                if (filterStatus) {
                    query = query.eq('status', filterStatus);
                }

                const { data: empData } = await query.order('created_at', { ascending: false });

                setEmployees(empData || []);
            }
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
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
        <TouchableOpacity
            onPress={() => navigation.navigate('EmployeeDetails', { employeeId: item.id })}
        >
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.employeeHeader}>
                        <View style={styles.employeeInfo}>
                            <Text style={[styles.employeeName, { color: theme.colors.text }]}>
                                {item.profiles?.full_name || 'Unknown'}
                            </Text>
                            <Text style={[styles.employeeNumber, { color: theme.colors.textSecondary }]}>#{item.employee_number}</Text>
                        </View>
                        <Chip
                            style={[
                                styles.statusChip,
                                { backgroundColor: getStatusColor(item.status) + '20' },
                            ]}
                            textStyle={{ color: getStatusColor(item.status) }}
                        >
                            {t(`employees.${item.status}`)}
                        </Chip>
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
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <SidebarLayout navigation={navigation} activeRoute="Employees">
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
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No employees found</Text>
                        </View>
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
        </SidebarLayout>
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
});
