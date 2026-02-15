import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { Card, Chip, Avatar, Searchbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';

interface Employee {
    id: string;
    employee_number: string;
    department: string;
    position: string;
    status: string;
    user_id: string;
    store_id: string;
    profiles: {
        full_name: string;
        email: string;
        phone: string;
    };
    stores: {
        store_name: string;
    };
}

export default function EmployeeDirectoryScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStore, setSelectedStore] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEmployees();
        loadStores();
    }, []);

    useEffect(() => {
        filterEmployees();
    }, [searchQuery, selectedStore, selectedDepartment, employees]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('employees')
                .select(`
          *,
          profiles!inner(full_name, email, phone),
          stores!inner(store_name)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setEmployees(data || []);

            // Extract unique departments
            const uniqueDepts = [...new Set(data?.map((e: any) => e.department).filter(Boolean))];
            setDepartments(uniqueDepts as string[]);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadStores = async () => {
        try {
            const { data, error } = await supabase
                .from('stores')
                .select('id, store_name')
                .eq('status', 'active');

            if (error) throw error;
            setStores(data || []);
        } catch (error) {
            console.error('Error loading stores:', error);
        }
    };

    const filterEmployees = () => {
        let filtered = employees;

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(
                (emp) =>
                    emp.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    emp.employee_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    emp.profiles.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by store
        if (selectedStore) {
            filtered = filtered.filter((emp) => emp.store_id === selectedStore);
        }

        // Filter by department
        if (selectedDepartment) {
            filtered = filtered.filter((emp) => emp.department === selectedDepartment);
        }

        setFilteredEmployees(filtered);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadEmployees();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return theme.colors.success;
            case 'inactive':
                return theme.colors.textSecondary;
            case 'on_leave':
                return theme.colors.warning;
            case 'suspended':
                return theme.colors.error;
            default:
                return theme.colors.textSecondary;
        }
    };

    const renderEmployee = ({ item }: { item: Employee }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('EmployeeDetails', { employeeId: item.id })}
        >
            <Card style={[styles.employeeCard, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.employeeHeader}>
                        <Avatar.Text
                            size={50}
                            label={item.profiles.full_name.substring(0, 2).toUpperCase()}
                            style={{ backgroundColor: theme.colors.primary }}
                            labelStyle={{ color: '#FFFFFF' }}
                        />
                        <View style={styles.employeeInfo}>
                            <Text style={[styles.employeeName, { color: theme.colors.text }]}>{item.profiles.full_name}</Text>
                            <Text style={[styles.employeeNumber, { color: theme.colors.textSecondary }]}>{item.employee_number}</Text>
                            <Text style={[styles.employeeStore, { color: theme.colors.primary }]}>{item.stores.store_name}</Text>
                        </View>
                        <Chip
                            mode="flat"
                            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                            textStyle={{ color: getStatusColor(item.status) }}
                        >
                            {item.status}
                        </Chip>
                    </View>
                    <View style={styles.employeeDetails}>
                        <View style={styles.detailRow}>
                            <Ionicons name="briefcase-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.position || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="business-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.department || 'N/A'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="mail-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.profiles.email}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Ionicons name="call-outline" size={16} color={theme.colors.textSecondary} />
                            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>{item.profiles.phone || 'N/A'}</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Search Bar */}
            <Searchbar
                placeholder="Search employees..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                inputStyle={{ color: theme.colors.text }}
                iconColor={theme.colors.textSecondary}
                placeholderTextColor={theme.colors.textSecondary}
            />

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Filter by Store:</Text>
                <FlatList
                    horizontal
                    data={stores}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Chip
                            selected={selectedStore === item.id}
                            onPress={() => setSelectedStore(selectedStore === item.id ? null : item.id)}
                            style={styles.filterChip}
                            selectedColor={theme.colors.primary}
                        >
                            {item.store_name}
                        </Chip>
                    )}
                    showsHorizontalScrollIndicator={false}
                />
            </View>

            <View style={styles.filtersContainer}>
                <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Filter by Department:</Text>
                <FlatList
                    horizontal
                    data={departments}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <Chip
                            selected={selectedDepartment === item}
                            onPress={() => setSelectedDepartment(selectedDepartment === item ? null : item)}
                            style={styles.filterChip}
                            selectedColor={theme.colors.primary}
                        >
                            {item}
                        </Chip>
                    )}
                    showsHorizontalScrollIndicator={false}
                />
            </View>

            {/* Results Count */}
            <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
            </Text>

            {/* Employee List */}
            <FlatList
                data={filteredEmployees}
                renderItem={renderEmployee}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No employees found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchBar: {
        margin: 10,
        elevation: 2,
    },
    filtersContainer: {
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    filterChip: {
        marginRight: 8,
    },
    resultsCount: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        fontSize: 14,
    },
    listContent: {
        padding: 10,
    },
    employeeCard: {
        marginBottom: 10,
        elevation: 2,
    },
    employeeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    employeeInfo: {
        flex: 1,
        marginLeft: 12,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    employeeNumber: {
        fontSize: 12,
    },
    employeeStore: {
        fontSize: 12,
        marginTop: 2,
    },
    statusChip: {
        height: 28,
    },
    employeeDetails: {
        marginTop: 8,
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 10,
    },
});
