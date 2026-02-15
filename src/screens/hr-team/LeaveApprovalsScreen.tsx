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
import { Card, Button, Chip, Avatar, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

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
            annual: Colors.primary,
            sick: Colors.error,
            emergency: Colors.warning,
            hajj: Colors.success,
            maternity: '#E91E63',
            paternity: '#9C27B0',
            bereavement: '#607D8B',
            marriage: '#FF9800',
        };
        return colors[type] || Colors.textSecondary;
    };

    const calculateDays = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const renderLeaveRequest = ({ item }: { item: LeaveRequest }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <Avatar.Text
                        size={40}
                        label={item.employees.profiles.full_name.substring(0, 2).toUpperCase()}
                        style={{ backgroundColor: Colors.primary }}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={styles.employeeName}>{item.employees.profiles.full_name}</Text>
                        <Text style={styles.employeeNumber}>{item.employees.employee_number}</Text>
                        <Text style={styles.storeName}>{item.employees.stores.store_name}</Text>
                    </View>
                    <Chip
                        mode="flat"
                        style={[
                            styles.statusChip,
                            {
                                backgroundColor:
                                    item.status === 'approved'
                                        ? Colors.success + '20'
                                        : item.status === 'rejected'
                                            ? Colors.error + '20'
                                            : Colors.warning + '20',
                            },
                        ]}
                        textStyle={{
                            color:
                                item.status === 'approved'
                                    ? Colors.success
                                    : item.status === 'rejected'
                                        ? Colors.error
                                        : Colors.warning,
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
                    <Text style={styles.leaveDuration}>
                        {calculateDays(item.start_date, item.end_date)} day(s)
                    </Text>
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>From:</Text>
                        <Text style={styles.dateValue}>
                            {new Date(item.start_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>To:</Text>
                        <Text style={styles.dateValue}>
                            {new Date(item.end_date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                {item.reason && (
                    <View style={styles.reasonContainer}>
                        <Text style={styles.reasonLabel}>Reason:</Text>
                        <Text style={styles.reasonText}>{item.reason}</Text>
                    </View>
                )}

                {item.status === 'pending' && (
                    <View style={styles.actions}>
                        <Button
                            mode="contained"
                            onPress={() => handleApprove(item.id)}
                            style={[styles.actionButton, { backgroundColor: Colors.success }]}
                            icon="checkmark-circle"
                        >
                            Approve
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => handleReject(item.id)}
                            style={styles.actionButton}
                            textColor={Colors.error}
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
        <View style={styles.container}>
            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                <Chip
                    selected={filter === 'pending'}
                    onPress={() => setFilter('pending')}
                    style={styles.filterChip}
                >
                    Pending
                </Chip>
                <Chip
                    selected={filter === 'approved'}
                    onPress={() => setFilter('approved')}
                    style={styles.filterChip}
                >
                    Approved
                </Chip>
                <Chip
                    selected={filter === 'rejected'}
                    onPress={() => setFilter('rejected')}
                    style={styles.filterChip}
                >
                    Rejected
                </Chip>
                <Chip
                    selected={filter === 'all'}
                    onPress={() => setFilter('all')}
                    style={styles.filterChip}
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
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={64} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No leave requests found</Text>
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
    filterContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
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
        color: Colors.text,
    },
    employeeNumber: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    storeName: {
        fontSize: 12,
        color: Colors.primary,
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
        color: Colors.text,
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
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    reasonContainer: {
        marginBottom: 12,
        padding: 10,
        backgroundColor: Colors.background,
        borderRadius: 8,
    },
    reasonLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    reasonText: {
        fontSize: 14,
        color: Colors.text,
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
