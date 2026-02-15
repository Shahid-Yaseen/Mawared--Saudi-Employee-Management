import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import SidebarLayout from '../../components/SidebarLayout';

export default function ApprovalsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [employeeRequests, setEmployeeRequests] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'leave' | 'requests'>('leave');

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
                // Get pending leave requests
                const { data: leaveData } = await supabase
                    .from('leave_requests')
                    .select('*, employees(employee_number, profiles(full_name)), leave_types(name)')
                    .eq('store_id', storeData.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                setLeaveRequests(leaveData || []);

                // Get pending employee requests
                const { data: requestsData } = await supabase
                    .from('employee_requests')
                    .select('*, employees(employee_number, profiles(full_name)), request_types(name)')
                    .eq('store_id', storeData.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                setEmployeeRequests(requestsData || []);
            }
        } catch (error) {
            console.error('Error loading approvals:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleLeaveApproval = async (requestId: string, approved: boolean, reason?: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: approved ? 'approved' : 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: reason,
                })
                .eq('id', requestId);

            if (error) throw error;

            Alert.alert(
                t('common.success'),
                `Leave request ${approved ? 'approved' : 'rejected'} successfully`
            );
            loadData();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        }
    };

    const handleRequestApproval = async (requestId: string, approved: boolean, reason?: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('employee_requests')
                .update({
                    status: approved ? 'approved' : 'rejected',
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: reason,
                })
                .eq('id', requestId);

            if (error) throw error;

            Alert.alert(
                t('common.success'),
                `Request ${approved ? 'approved' : 'rejected'} successfully`
            );
            loadData();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        }
    };

    const promptRejection = (type: 'leave' | 'request', id: string) => {
        Alert.prompt(
            'Rejection Reason',
            'Please provide a reason for rejection',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: (reason) => {
                        if (type === 'leave') {
                            handleLeaveApproval(id, false, reason);
                        } else {
                            handleRequestApproval(id, false, reason);
                        }
                    },
                },
            ],
            'plain-text'
        );
    };

    return (
        <SidebarLayout navigation={navigation} activeRoute="Approvals">
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {isLargeScreen && (
                    <View style={{ padding: Spacing.lg, paddingBottom: 0 }}>
                        <Text style={{ ...Typography.h3, fontWeight: '800', color: theme.colors.text }}>{t('requests.title')}</Text>
                    </View>
                )}
                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'leave' && { borderBottomColor: theme.colors.primary }]}
                        onPress={() => setActiveTab('leave')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'leave' ? theme.colors.primary : theme.colors.textSecondary }, activeTab === 'leave' && styles.activeTabText]}>
                            Leave Requests ({leaveRequests.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'requests' && { borderBottomColor: theme.colors.primary }]}
                        onPress={() => setActiveTab('requests')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'requests' ? theme.colors.primary : theme.colors.textSecondary }, activeTab === 'requests' && styles.activeTabText]}>
                            Other Requests ({employeeRequests.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                >
                    {activeTab === 'leave' ? (
                        leaveRequests.length === 0 ? (
                            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Card.Content>
                                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No pending leave requests</Text>
                                </Card.Content>
                            </Card>
                        ) : (
                            leaveRequests.map((request) => (
                                <Card key={request.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                    <Card.Content>
                                        <View style={styles.requestHeader}>
                                            <Text style={[styles.employeeName, { color: theme.colors.text }]}>
                                                {request.employees?.profiles?.full_name || 'Unknown'}
                                            </Text>
                                            <Chip
                                                style={[styles.chip, { backgroundColor: theme.colors.background }]}
                                                textStyle={{ color: theme.colors.text }}
                                            >
                                                #{request.employees?.employee_number}
                                            </Chip>
                                        </View>

                                        <Text style={[styles.leaveType, { color: theme.colors.primary }]}>
                                            {request.leave_types?.name || 'Leave'}
                                        </Text>

                                        <View style={styles.dateContainer}>
                                            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                                                {new Date(request.start_date).toLocaleDateString()} -{' '}
                                                {new Date(request.end_date).toLocaleDateString()}
                                            </Text>
                                            <Text style={[styles.daysText, { color: theme.colors.textSecondary }]}>
                                                {request.total_days} {t('leave.days')}
                                            </Text>
                                        </View>

                                        {request.reason && (
                                            <View style={[styles.reasonContainer, { backgroundColor: theme.colors.background }]}>
                                                <Text style={[styles.reasonLabel, { color: theme.colors.textSecondary }]}>Reason:</Text>
                                                <Text style={[styles.reasonText, { color: theme.colors.text }]}>{request.reason}</Text>
                                            </View>
                                        )}

                                        <View style={styles.actionButtons}>
                                            <Button
                                                mode="outlined"
                                                onPress={() => promptRejection('leave', request.id)}
                                                style={[styles.actionButton, styles.rejectButton, { borderColor: theme.colors.error }]}
                                                textColor={theme.colors.error}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                mode="contained"
                                                onPress={() => handleLeaveApproval(request.id, true)}
                                                style={[styles.actionButton, styles.approveButton, { backgroundColor: theme.colors.success }]}
                                                textColor="#FFFFFF"
                                            >
                                                Approve
                                            </Button>
                                        </View>
                                    </Card.Content>
                                </Card>
                            ))
                        )
                    ) : (
                        employeeRequests.length === 0 ? (
                            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Card.Content>
                                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No pending requests</Text>
                                </Card.Content>
                            </Card>
                        ) : (
                            employeeRequests.map((request) => (
                                <Card key={request.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                    <Card.Content>
                                        <View style={styles.requestHeader}>
                                            <Text style={[styles.employeeName, { color: theme.colors.text }]}>
                                                {request.employees?.profiles?.full_name || 'Unknown'}
                                            </Text>
                                            <Chip
                                                style={[styles.chip, { backgroundColor: theme.colors.background }]}
                                                textStyle={{ color: theme.colors.text }}
                                            >
                                                #{request.employees?.employee_number}
                                            </Chip>
                                        </View>

                                        <Text style={[styles.leaveType, { color: theme.colors.primary }]}>
                                            {request.request_types?.name || 'Request'}
                                        </Text>

                                        {request.amount && (
                                            <Text style={[styles.amount, { color: theme.colors.primary }]}>
                                                Amount: {request.amount} {t('payroll.sar')}
                                            </Text>
                                        )}

                                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{request.description}</Text>

                                        <View style={styles.actionButtons}>
                                            <Button
                                                mode="outlined"
                                                onPress={() => promptRejection('request', request.id)}
                                                style={[styles.actionButton, styles.rejectButton, { borderColor: theme.colors.error }]}
                                                textColor={theme.colors.error}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                mode="contained"
                                                onPress={() => handleRequestApproval(request.id, true)}
                                                style={[styles.actionButton, styles.approveButton, { backgroundColor: theme.colors.success }]}
                                                textColor="#FFFFFF"
                                            >
                                                Approve
                                            </Button>
                                        </View>
                                    </Card.Content>
                                </Card>
                            ))
                        )
                    )}
                </ScrollView>
            </View>
        </SidebarLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        ...Shadows.small,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        ...Typography.body,
    },
    activeTabText: {
        fontWeight: '600',
    },
    content: {
        padding: Spacing.md,
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    employeeName: {
        ...Typography.h5,
    },
    chip: {
        height: 28,
    },
    leaveType: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    dateContainer: {
        marginBottom: Spacing.sm,
    },
    dateText: {
        ...Typography.body,
    },
    daysText: {
        ...Typography.caption,
    },
    reasonContainer: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.md,
    },
    reasonLabel: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
    },
    reasonText: {
        ...Typography.body,
    },
    amount: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    description: {
        ...Typography.body,
        marginBottom: Spacing.md,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionButton: {
        flex: 1,
        borderRadius: BorderRadius.md,
    },
    rejectButton: {
    },
    approveButton: {
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
});
