import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { Card, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import SidebarLayout from '../../components/SidebarLayout';

export default function LeaveScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
    const [employeeId, setEmployeeId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: empData } = await supabase
                .from('employees')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (empData) {
                setEmployeeId(empData.id);

                // Get leave balances
                const { data: balancesData } = await supabase
                    .from('leave_balances')
                    .select('*, leave_types(*)')
                    .eq('employee_id', empData.id)
                    .eq('year', new Date().getFullYear());

                setLeaveBalances(balancesData || []);

                // Get leave requests
                const { data: requestsData } = await supabase
                    .from('leave_requests')
                    .select('*, leave_types(*)')
                    .eq('employee_id', empData.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                setLeaveRequests(requestsData || []);
            }
        } catch (error) {
            console.error('Error loading leave data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return theme.colors.success;
            case 'rejected':
                return theme.colors.error;
            case 'pending':
                return theme.colors.warning;
            default:
                return theme.colors.textSecondary;
        }
    };

    const content = (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Leave Balances */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('leave.balance')}</Text>
                {leaveBalances.map((balance) => (
                    <Card key={balance.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <View style={styles.balanceHeader}>
                                <Text style={[styles.leaveType, { color: theme.colors.text }]}>
                                    {balance.leave_types?.name || 'Leave'}
                                </Text>
                                <Text style={[styles.remainingDays, { color: theme.colors.primary }]}>
                                    {balance.remaining_days} / {balance.total_days} {t('leave.days')}
                                </Text>
                            </View>

                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                backgroundColor: theme.colors.primary,
                                                width: `${(balance.remaining_days / balance.total_days) * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>

                            <View style={styles.balanceDetails}>
                                <View style={styles.balanceItem}>
                                    <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>{t('leave.used')}</Text>
                                    <Text style={[styles.balanceValue, { color: theme.colors.text }]}>{balance.used_days}</Text>
                                </View>
                                <View style={styles.balanceItem}>
                                    <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>{t('leave.remaining')}</Text>
                                    <Text style={[styles.balanceValue, { color: theme.colors.text }]}>{balance.remaining_days}</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                ))}

                {/* Leave Requests History */}
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('leave.history')}</Text>
                {leaveRequests.length === 0 ? (
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No leave requests yet</Text>
                        </Card.Content>
                    </Card>
                ) : (
                    leaveRequests.map((request) => (
                        <Card key={request.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <View style={styles.requestHeader}>
                                    <Text style={[styles.requestType, { color: theme.colors.text }]}>
                                        {request.leave_types?.name || 'Leave'}
                                    </Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: getStatusColor(request.status) + '20' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                { color: getStatusColor(request.status) },
                                            ]}
                                        >
                                            {t(`leave.${request.status}`)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.requestDetails}>
                                    <Text style={[styles.requestDate, { color: theme.colors.textSecondary }]}>
                                        {new Date(request.start_date).toLocaleDateString()} -{' '}
                                        {new Date(request.end_date).toLocaleDateString()}
                                    </Text>
                                    <Text style={[styles.requestDays, { color: theme.colors.textSecondary }]}>
                                        {request.total_days} {t('leave.days')}
                                    </Text>
                                </View>

                                {request.reason && (
                                    <Text style={[styles.requestReason, { color: theme.colors.textSecondary }]}>{request.reason}</Text>
                                )}

                                {request.rejection_reason && (
                                    <View style={[styles.rejectionContainer, { backgroundColor: theme.dark ? '#3E2723' : '#FFEBEE' }]}>
                                        <Text style={[styles.rejectionLabel, { color: theme.colors.error }]}>Rejection Reason:</Text>
                                        <Text style={[styles.rejectionText, { color: theme.colors.error }]}>
                                            {request.rejection_reason}
                                        </Text>
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <FAB
                icon="plus"
                label={t('leave.request')}
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary || '#FFFFFF'}
                onPress={() => navigation.navigate('RequestLeave', { employeeId })}
            />
        </View>
    );

    return isLargeScreen ? (
        <SidebarLayout navigation={navigation} activeRoute="Leave">
            {content}
        </SidebarLayout>
    ) : (
        content
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    sectionTitle: {
        ...Typography.h4,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    leaveType: {
        ...Typography.h5,
    },
    remainingDays: {
        ...Typography.body,
        fontWeight: '600',
    },
    progressContainer: {
        marginBottom: Spacing.md,
    },
    progressBar: {
        height: 8,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    balanceDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    balanceItem: {
        alignItems: 'center',
    },
    balanceLabel: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
    },
    balanceValue: {
        ...Typography.h4,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    requestType: {
        ...Typography.h5,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    requestDetails: {
        marginBottom: Spacing.sm,
    },
    requestDate: {
        ...Typography.body,
    },
    requestDays: {
        ...Typography.caption,
    },
    requestReason: {
        ...Typography.caption,
        fontStyle: 'italic',
    },
    rejectionContainer: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    rejectionLabel: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    rejectionText: {
        ...Typography.caption,
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
    fab: {
        position: 'absolute',
        right: Spacing.md,
        bottom: Spacing.md,
    },
});
