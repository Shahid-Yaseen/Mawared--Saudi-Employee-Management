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
import { Card, Button, Chip, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';

interface LeaveRequest {
    id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
    created_at: string;
    employees: {
        id: string;
        employee_number: string;
        profiles: {
            full_name: string;
            email: string;
        };
        stores: {
            store_name: string;
        };
    };
}

export default function LeaveApprovalsScreen() {
    const { theme } = useTheme();
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaveRequests();
    }, [filter]);

    const loadLeaveRequests = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('leave_requests')
                .select(`
          *,
          employees!inner(
            id,
            employee_number,
            profiles!inner(full_name, email),
            stores!inner(store_name)
          )
        `)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLeaveRequests(data || []);
        } catch (error) {
            console.error('Error loading leave requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: 'approved',
                    approved_by: user?.id,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', requestId);

            if (error) throw error;

            Alert.alert('Success', 'Leave request approved');
            loadLeaveRequests();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleReject = async (requestId: string) => {
        Alert.prompt(
            'Reject Leave Request',
            'Please provide a reason for rejection:',
            async (reason) => {
                if (!reason) return;

                try {
                    const { data: { user } } = await supabase.auth.getUser();

                    const { error } = await supabase
                        .from('leave_requests')
                        .update({
                            status: 'rejected',
                            approved_by: user?.id,
                            approved_at: new Date().toISOString(),
                        })
                        .eq('id', requestId);

                    if (error) throw error;

                    Alert.alert('Success', 'Leave request rejected');
                    loadLeaveRequests();
                } catch (error: any) {
                    Alert.alert('Error', error.message);
                }
            }
        );
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadLeaveRequests();
    };

    const getLeaveTypeColor = (type: string) => {
        const colors: any = {
            annual: theme.colors.primary,
            sick: theme.colors.error,
            emergency: theme.colors.warning,
            hajj: theme.colors.success,
            maternity: '#E91E63',
            paternity: '#9C27B0',
            bereavement: '#607D8B',
            marriage: '#FF9800',
        };
        return colors[type] || theme.colors.textSecondary;
    };

    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const renderLeaveRequest = ({ item }: { item: LeaveRequest }) => (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Avatar.Text
                        size={40}
                        label={item.employees.profiles.full_name.substring(0, 2).toUpperCase()}
                        style={{ backgroundColor: theme.colors.primary }}
                        labelStyle={{ color: '#FFFFFF' }}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={[styles.employeeName, { color: theme.colors.text }]}>{item.employees.profiles.full_name}</Text>
                        <Text style={[styles.employeeNumber, { color: theme.colors.textSecondary }]}>{item.employees.employee_number}</Text>
                        <Text style={[styles.storeName, { color: theme.colors.primary }]}>{item.employees.stores.store_name}</Text>
                    </View>
                    <Chip
                        mode="flat"
                        style={[
                            styles.statusChip,
                            {
                                backgroundColor:
                                    item.status === 'approved'
                                        ? theme.colors.success + '20'
                                        : item.status === 'rejected'
                                            ? theme.colors.error + '20'
                                            : theme.colors.warning + '20',
                            },
                        ]}
                        textStyle={{
                            color:
                                item.status === 'approved'
                                    ? theme.colors.success
                                    : item.status === 'rejected'
                                        ? theme.colors.error
                                        : theme.colors.warning,
                        }}
                    >
                        {item.status}
                    </Chip>
                </View>

                <View style={styles.leaveDetails}>
                    <Chip
                        mode="outlined"
                        style={[styles.leaveTypeChip, { borderColor: getLeaveTypeColor(item.leave_type) }]}
                        textStyle={{ color: getLeaveTypeColor(item.leave_type) }}
                    >
                        {item.leave_type.toUpperCase()}
                    </Chip>
                    <Text style={[styles.leaveDuration, { color: theme.colors.text }]}>
                        {calculateDays(item.start_date, item.end_date)} day(s)
                    </Text>
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                        <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>From:</Text>
                        <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                            {new Date(item.start_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.dateItem}>
                        <Text style={[styles.dateLabel, { color: theme.colors.textSecondary }]}>To:</Text>
                        <Text style={[styles.dateValue, { color: theme.colors.text }]}>
                            {new Date(item.end_date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {item.reason && (
                    <View style={[styles.reasonContainer, { backgroundColor: theme.colors.background }]}>
                        <Text style={[styles.reasonLabel, { color: theme.colors.textSecondary }]}>Reason:</Text>
                        <Text style={[styles.reasonText, { color: theme.colors.text }]}>{item.reason}</Text>
                    </View>
                )}

                {item.status === 'pending' && (
                    <View style={styles.actions}>
                        <Button
                            mode="contained"
                            onPress={() => handleApprove(item.id)}
                            style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                            icon="check-circle"
                            textColor="#FFFFFF"
                        >
                            Approve
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => handleReject(item.id)}
                            style={styles.actionButton}
                            textColor={theme.colors.error}
                            icon="close-circle"
                        >
                            Reject
                        </Button>
                    </View>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Filter Chips */}
            <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
                <Chip
                    selected={filter === 'pending'}
                    onPress={() => setFilter('pending')}
                    style={styles.filterChip}
                    selectedColor={theme.colors.primary}
                >
                    Pending
                </Chip>
                <Chip
                    selected={filter === 'approved'}
                    onPress={() => setFilter('approved')}
                    style={styles.filterChip}
                    selectedColor={theme.colors.primary}
                >
                    Approved
                </Chip>
                <Chip
                    selected={filter === 'rejected'}
                    onPress={() => setFilter('rejected')}
                    style={styles.filterChip}
                    selectedColor={theme.colors.primary}
                >
                    Rejected
                </Chip>
                <Chip
                    selected={filter === 'all'}
                    onPress={() => setFilter('all')}
                    style={styles.filterChip}
                    selectedColor={theme.colors.primary}
                >
                    All
                </Chip>
            </View>

            {/* Leave Requests List */}
            <FlatList
                data={leaveRequests}
                renderItem={renderLeaveRequest}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No leave requests found</Text>
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
    filterContainer: {
        flexDirection: 'row',
        padding: 10,
        elevation: 2,
    },
    filterChip: {
        marginRight: 8,
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
        marginBottom: 12,
    },
    headerInfo: {
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
    storeName: {
        fontSize: 12,
    },
    statusChip: {
        height: 28,
    },
    leaveDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    leaveTypeChip: {
        marginRight: 10,
    },
    leaveDuration: {
        fontSize: 14,
        fontWeight: '600',
    },
    dateRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    dateItem: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    reasonContainer: {
        marginBottom: 12,
        padding: 10,
        borderRadius: 8,
    },
    reasonLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    reasonText: {
        fontSize: 14,
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
});
