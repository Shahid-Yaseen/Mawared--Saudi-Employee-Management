import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';

interface DashboardStats {
    totalStores: number;
    totalEmployees: number;
    pendingLeaveRequests: number;
    pendingEmployeeRequests: number;
}

interface RecentActivity {
    id: string;
    type: string;
    message: string;
    timestamp: string;
}

export default function HRDashboardScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [stats, setStats] = useState<DashboardStats>({
        totalStores: 0,
        totalEmployees: 0,
        pendingLeaveRequests: 0,
        pendingEmployeeRequests: 0,
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Get total stores
            const { count: storesCount } = await supabase
                .from('stores')
                .select('*', { count: 'exact', head: true });

            // Get total employees
            const { count: employeesCount } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true });

            // Get pending leave requests
            const { count: leaveCount } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // Get pending employee requests
            const { count: requestsCount } = await supabase
                .from('employee_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            // Get recent activity
            const { data: leaves } = await supabase
                .from('leave_requests')
                .select(`
          id,
          leave_type,
          status,
          created_at,
          employees!inner(
            user_id,
            profiles!inner(full_name)
          )
        `)
                .order('created_at', { ascending: false })
                .limit(5);

            const activity: RecentActivity[] = (leaves || []).map((leave: any) => ({
                id: leave.id,
                type: 'leave_request',
                message: `${leave.employees.profiles.full_name} requested ${leave.leave_type} leave`,
                timestamp: leave.created_at,
            }));

            setStats({
                totalStores: storesCount || 0,
                totalEmployees: employeesCount || 0,
                pendingLeaveRequests: leaveCount || 0,
                pendingEmployeeRequests: requestsCount || 0,
            });
            setRecentActivity(activity);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    const StatCard = ({ title, value, icon, color, onPress }: any) => (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
        >
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
                <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Title style={styles.headerTitle}>HR Dashboard</Title>
                <Paragraph style={styles.headerSubtitle}>
                    Multi-Store Management Overview
                </Paragraph>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Total Stores"
                    value={stats.totalStores}
                    icon="business"
                    color={theme.colors.primary}
                    onPress={() => navigation.navigate('StoreManagement')}
                />
                <StatCard
                    title="Total Employees"
                    value={stats.totalEmployees}
                    icon="people"
                    color={theme.colors.success}
                    onPress={() => navigation.navigate('EmployeeDirectory')}
                />
                <StatCard
                    title="Pending Leaves"
                    value={stats.pendingLeaveRequests}
                    icon="calendar"
                    color={theme.colors.warning}
                    onPress={() => navigation.navigate('LeaveApprovals')}
                />
                <StatCard
                    title="Pending Requests"
                    value={stats.pendingEmployeeRequests}
                    icon="document-text"
                    color={theme.colors.info}
                    onPress={() => navigation.navigate('EmployeeRequests')}
                />
            </View>

            {/* Quick Actions */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Title style={{ color: theme.colors.text }}>Quick Actions</Title>
                    <View style={styles.quickActions}>
                        <Button
                            mode="contained"
                            icon="account-group"
                            onPress={() => navigation.navigate('EmployeeDirectory')}
                            style={styles.actionButton}
                            buttonColor={theme.colors.primary}
                        >
                            Employee Directory
                        </Button>
                        <Button
                            mode="contained"
                            icon="calendar-check"
                            onPress={() => navigation.navigate('LeaveApprovals')}
                            style={styles.actionButton}
                            buttonColor={theme.colors.primary}
                        >
                            Approve Leaves
                        </Button>
                        <Button
                            mode="contained"
                            icon="cash"
                            onPress={() => navigation.navigate('PayrollOverview')}
                            style={styles.actionButton}
                            buttonColor={theme.colors.primary}
                        >
                            Payroll Overview
                        </Button>
                        <Button
                            mode="contained"
                            icon="chart-bar"
                            onPress={() => navigation.navigate('Reports')}
                            style={styles.actionButton}
                            buttonColor={theme.colors.primary}
                        >
                            View Reports
                        </Button>
                    </View>
                </Card.Content>
            </Card>

            {/* Recent Activity */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Title style={{ color: theme.colors.text }}>Recent Activity</Title>
                    {recentActivity.length === 0 ? (
                        <Paragraph style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No recent activity</Paragraph>
                    ) : (
                        recentActivity.map((activity) => (
                            <View key={activity.id} style={[styles.activityItem, { borderBottomColor: theme.colors.divider }]}>
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color={theme.colors.textSecondary}
                                />
                                <View style={styles.activityContent}>
                                    <Text style={[styles.activityMessage, { color: theme.colors.text }]}>{activity.message}</Text>
                                    <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: '#fff',
        opacity: 0.9,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
    },
    statCard: {
        width: '48%',
        borderRadius: 12,
        padding: 15,
        margin: '1%',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statTitle: {
        fontSize: 12,
    },
    card: {
        margin: 10,
        elevation: 2,
    },
    quickActions: {
        marginTop: 10,
    },
    actionButton: {
        marginVertical: 5,
    },
    activityItem: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    activityContent: {
        flex: 1,
        marginLeft: 10,
    },
    activityMessage: {
        fontSize: 14,
    },
    activityTime: {
        fontSize: 12,
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
    },
});
