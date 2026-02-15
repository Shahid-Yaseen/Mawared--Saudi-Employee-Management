import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { Card, Button, Avatar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { Employee, AttendanceRecord, LeaveBalance, Profile } from '../../types';


interface EmployeeWithProfile extends Employee {
    profiles: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export default function EmployeeHomeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [employee, setEmployee] = useState<EmployeeWithProfile | null>(null);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [stats, setStats] = useState({
        weeklyHours: 0,
        daysPresent: 0,
        leaveTaken: 0,
        monthlyData: [] as { month: string; hours: number }[],
        recentActivity: [] as any[],
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get employee record
            const { data: empData } = await supabase
                .from('employees')
                .select('*, profiles!inner(full_name, avatar_url)')
                .eq('profile_id', user.id)
                .single();

            if (empData) {
                setEmployee(empData);

                // Get today's attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: attendanceData } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('employee_id', empData.id)
                    .eq('date', today)
                    .maybeSingle();

                setTodayAttendance(attendanceData);

                // Get leave balances
                const { data: balancesData } = await supabase
                    .from('leave_balances')
                    .select('*, leave_types(*)')
                    .eq('employee_id', empData.id)
                    .eq('year', new Date().getFullYear());

                setLeaveBalances(balancesData || []);

                // Get pending requests count
                const { count } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('employee_id', empData.id)
                    .eq('status', 'pending');

                const { count: empRequestsCount } = await supabase
                    .from('employee_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('employee_id', empData.id)
                    .eq('status', 'pending');

                setPendingRequestsCount((count || 0) + (empRequestsCount || 0));

                // Get weekly hours
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                const weekStart = startOfWeek.toISOString().split('T')[0];

                const { data: weeklyAttendance } = await supabase
                    .from('attendance')
                    .select('hours_worked')
                    .eq('employee_id', empData.id)
                    .gte('date', weekStart)
                    .lte('date', today);

                const weeklyHours = weeklyAttendance?.reduce((sum, record) => sum + (record.hours_worked || 0), 0) || 0;

                // Get monthly presence
                const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const { count: daysPresent } = await supabase
                    .from('attendance')
                    .select('*', { count: 'exact', head: true })
                    .eq('employee_id', empData.id)
                    .gte('date', firstDayOfMonth)
                    .eq('status', 'present');

                // Get leave taken this year
                const { data: leaveTakenData } = await supabase
                    .from('leave_requests')
                    .select('days_requested')
                    .eq('employee_id', empData.id)
                    .eq('status', 'approved')
                    .gte('start_date', `${new Date().getFullYear()}-01-01`);

                const leaveTaken = leaveTakenData?.reduce((sum, req) => sum + (req.days_requested || 0), 0) || 0;

                // Get last 3 months data
                const months = ['Oct', 'Nov', 'Dec'];
                const monthlyData = await Promise.all(
                    months.map(async (month, index) => {
                        const monthNum = new Date().getMonth() - (2 - index);
                        const year = new Date().getFullYear();
                        const firstDay = new Date(year, monthNum, 1).toISOString().split('T')[0];
                        const lastDay = new Date(year, monthNum + 1, 0).toISOString().split('T')[0];

                        const { data } = await supabase
                            .from('attendance')
                            .select('hours_worked')
                            .eq('employee_id', empData.id)
                            .gte('date', firstDay)
                            .lte('date', lastDay);

                        const hours = data?.reduce((sum, record) => sum + (record.hours_worked || 0), 0) || 0;
                        return { month, hours };
                    })
                );

                // Get recent activity (last 5 attendance records)
                const { data: recentActivity } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('employee_id', empData.id)
                    .order('date', { ascending: false })
                    .limit(5);

                setStats({
                    weeklyHours: Math.round(weeklyHours * 10) / 10,
                    daysPresent: daysPresent || 0,
                    leaveTaken,
                    monthlyData,
                    recentActivity: recentActivity || [],
                });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getStatusColor = () => {
        if (!todayAttendance) return theme.colors.textSecondary;
        if (!todayAttendance.clock_out_time) return theme.colors.success;
        return theme.colors.textSecondary;
    };

    const getStatusText = () => {
        if (!todayAttendance) return 'Not Clocked In';
        if (!todayAttendance.clock_out_time) return 'Clocked In';
        return 'Clocked Out';
    };

    const getTodayHours = () => {
        if (!todayAttendance || !todayAttendance.total_hours) return '0.0';
        return todayAttendance.total_hours.toFixed(1);
    };

    const renderMobileLayout = () => (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome Back</Text>
                    <Text style={[styles.name, { color: theme.colors.text }]}>
                        {employee?.profiles?.full_name || employee?.position || 'Employee'}
                    </Text>
                </View>
                <Avatar.Text
                    size={50}
                    label={employee?.profiles?.full_name?.substring(0, 2).toUpperCase() || 'EM'}
                    style={{ backgroundColor: theme.colors.primary }}
                    labelStyle={{ color: '#FFFFFF' }}
                />
            </View>

            {/* Quick Actions Card */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Actions</Text>

                    <View style={styles.statusContainer}>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                                Current Status
                            </Text>
                            <Text style={[styles.statusValue, { color: getStatusColor() }]}>{getStatusText()}</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                                Today's Hours
                            </Text>
                            <Text style={[styles.statusValue, { color: theme.colors.text }]}>{getTodayHours()}h</Text>
                        </View>
                    </View>

                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('Attendance')}
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        contentStyle={styles.actionButtonContent}
                        labelStyle={{ color: '#FFFFFF' }}
                        icon={todayAttendance?.clock_out_time ? 'login' : 'logout'}
                    >
                        {todayAttendance?.clock_out_time ? 'Clock In' : 'Clock Out'}
                    </Button>
                </Card.Content>
            </Card>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.weeklyHours}h</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>This Week</Text>
                    </Card.Content>
                </Card>

                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <MaterialCommunityIcons name="calendar-check" size={24} color={theme.colors.success} />
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.daysPresent}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Days Present</Text>
                    </Card.Content>
                </Card>

                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <MaterialCommunityIcons name="beach" size={24} color={theme.colors.info} />
                        <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.leaveTaken}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Leave Taken</Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Leave Balance Widget */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Leave Balance</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Leave')}>
                            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {leaveBalances.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No leave balances available
                        </Text>
                    ) : (
                        leaveBalances.slice(0, 2).map((balance: any) => (
                            <View key={balance.id} style={styles.leaveItem}>
                                <View style={styles.leaveInfo}>
                                    <Text style={[styles.leaveType, { color: theme.colors.text }]}>
                                        {balance.leave_types?.name || 'Leave'}
                                    </Text>
                                    <Text style={[styles.leaveDays, { color: theme.colors.textSecondary }]}>
                                        {balance.remaining_days} days remaining
                                    </Text>
                                </View>
                                <View style={[styles.leaveProgress, { backgroundColor: theme.colors.divider }]}>
                                    <View
                                        style={[
                                            styles.leaveProgressBar,
                                            {
                                                backgroundColor: theme.colors.primary,
                                                width: `${(balance.remaining_days / balance.total_days) * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        ))
                    )}

                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('Leave')}
                        style={[styles.requestLeaveButton, { borderColor: theme.colors.primary }]}
                        labelStyle={{ color: theme.colors.primary }}
                    >
                        Request Leave
                    </Button>
                </Card.Content>
            </Card>

            {/* Pending Requests Badge */}
            {pendingRequestsCount > 0 && (
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Requests')}
                            style={styles.pendingRequestsContainer}
                        >
                            <View style={styles.pendingRequestsInfo}>
                                <Text style={[styles.pendingRequestsTitle, { color: theme.colors.text }]}>
                                    Pending Requests
                                </Text>
                                <Text style={[styles.pendingRequestsCount, { color: theme.colors.textSecondary }]}>
                                    {pendingRequestsCount} {pendingRequestsCount === 1 ? 'request' : 'requests'}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                                <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{pendingRequestsCount}</Text>
                            </View>
                        </TouchableOpacity>
                    </Card.Content>
                </Card>
            )}

            {/* Quick Links */}
            <View style={styles.quickLinksContainer}>
                <TouchableOpacity
                    style={[styles.quickLink, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Attendance')}
                >
                    <View style={[styles.quickLinkIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                        <MaterialCommunityIcons name="calendar-clock" size={30} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickLink, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Leave')}
                >
                    <View style={[styles.quickLinkIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                        <MaterialCommunityIcons name="beach" size={30} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Leave</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickLink, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Requests')}
                >
                    <View style={[styles.quickLinkIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                        <MaterialCommunityIcons name="file-document" size={30} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickLink, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Payroll')}
                >
                    <View style={[styles.quickLinkIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                        <MaterialCommunityIcons name="cash" size={30} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.quickLinkText, { color: theme.colors.text }]}>Payroll</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderDesktopLayout = () => (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.desktopContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            {/* Header */}
            <View style={styles.desktopHeader}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome Back</Text>
                    <Text style={[styles.desktopName, { color: theme.colors.text }]}>
                        {employee?.profiles?.full_name || employee?.position || 'Employee'}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('Attendance')}
                        style={{ backgroundColor: theme.colors.primary, marginRight: Spacing.md }}
                        labelStyle={{ color: '#FFFFFF' }}
                        icon={todayAttendance?.check_out_time ? 'login' : 'logout'}
                    >
                        {todayAttendance?.check_out_time ? 'Clock In' : 'Clock Out'}
                    </Button>
                    <Avatar.Text
                        size={50}
                        label={employee?.profiles?.full_name?.substring(0, 2).toUpperCase() || 'EM'}
                        style={{ backgroundColor: theme.colors.primary }}
                        labelStyle={{ color: '#FFFFFF' }}
                    />
                </View>
            </View>

            {/* Stats Row */}
            <View style={styles.desktopStatsRow}>
                <Card style={[styles.desktopStatCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.statHeader}>
                            <MaterialCommunityIcons name="clock-outline" size={32} color={theme.colors.primary} />
                            <View style={styles.statInfo}>
                                <Text style={[styles.desktopStatValue, { color: theme.colors.text }]}>
                                    {stats.weeklyHours}h
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                    Hours This Week
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={[styles.desktopStatCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.statHeader}>
                            <MaterialCommunityIcons name="calendar-check" size={32} color={theme.colors.success} />
                            <View style={styles.statInfo}>
                                <Text style={[styles.desktopStatValue, { color: theme.colors.text }]}>
                                    {stats.daysPresent}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                    Days Present
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={[styles.desktopStatCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.statHeader}>
                            <MaterialCommunityIcons name="beach" size={32} color={theme.colors.info} />
                            <View style={styles.statInfo}>
                                <Text style={[styles.desktopStatValue, { color: theme.colors.text }]}>
                                    {stats.leaveTaken}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                    Leave Taken
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={[styles.desktopStatCard, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.statHeader}>
                            <MaterialCommunityIcons
                                name={todayAttendance?.check_out_time ? 'logout' : 'login'}
                                size={32}
                                color={getStatusColor()}
                            />
                            <View style={styles.statInfo}>
                                <Text style={[styles.desktopStatValue, { color: theme.colors.text }]}>
                                    {getTodayHours()}h
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                    Today's Hours
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            </View>

            {/* Main Content Grid */}
            <View style={styles.desktopGrid}>
                {/* Left Column */}
                <View style={styles.desktopLeftColumn}>
                    {/* Monthly Hours Chart */}
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Monthly Hours</Text>
                            <View style={styles.chartContainer}>
                                {stats.monthlyData.map((data, index) => {
                                    const maxHours = Math.max(...stats.monthlyData.map((d) => d.hours), 1);
                                    const height = (data.hours / maxHours) * 150;
                                    return (
                                        <View key={index} style={styles.barContainer}>
                                            <View style={styles.barWrapper}>
                                                <View
                                                    style={[
                                                        styles.bar,
                                                        {
                                                            height,
                                                            backgroundColor: theme.colors.primary,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>
                                                {data.month}
                                            </Text>
                                            <Text style={[styles.barValue, { color: theme.colors.text }]}>
                                                {data.hours}h
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </Card.Content>
                    </Card>

                    {/* Recent Activity */}
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                            {stats.recentActivity.length === 0 ? (
                                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                                    No recent activity
                                </Text>
                            ) : (
                                stats.recentActivity.map((activity, index) => (
                                    <View key={index} style={styles.activityItem}>
                                        <MaterialCommunityIcons
                                            name={activity.status === 'present' ? 'check-circle' : 'close-circle'}
                                            size={20}
                                            color={
                                                activity.status === 'present'
                                                    ? theme.colors.success
                                                    : theme.colors.error
                                            }
                                        />
                                        <View style={styles.activityInfo}>
                                            <Text style={[styles.activityText, { color: theme.colors.text }]}>
                                                {activity.status === 'present' ? 'Present' : 'Absent'} -{' '}
                                                {activity.hours_worked || 0}h
                                            </Text>
                                            <Text style={[styles.activityDate, { color: theme.colors.textSecondary }]}>
                                                {new Date(activity.date).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </Card.Content>
                    </Card>
                </View>

                {/* Right Column */}
                <View style={styles.desktopRightColumn}>
                    {/* Leave Balance */}
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Leave Balance</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Leave')}>
                                    <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
                                </TouchableOpacity>
                            </View>

                            {leaveBalances.length === 0 ? (
                                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                                    No leave balances available
                                </Text>
                            ) : (
                                leaveBalances.map((balance: any) => (
                                    <View key={balance.id} style={styles.leaveItem}>
                                        <View style={styles.leaveInfo}>
                                            <Text style={[styles.leaveType, { color: theme.colors.text }]}>
                                                {balance.leave_types?.name || 'Leave'}
                                            </Text>
                                            <Text style={[styles.leaveDays, { color: theme.colors.textSecondary }]}>
                                                {balance.remaining_days} / {balance.total_days} days
                                            </Text>
                                        </View>
                                        <View style={[styles.leaveProgress, { backgroundColor: theme.colors.divider }]}>
                                            <View
                                                style={[
                                                    styles.leaveProgressBar,
                                                    {
                                                        backgroundColor: theme.colors.primary,
                                                        width: `${(balance.remaining_days / balance.total_days) * 100}%`,
                                                    },
                                                ]}
                                            />
                                        </View>
                                    </View>
                                ))
                            )}

                            <Button
                                mode="contained"
                                onPress={() => navigation.navigate('Leave')}
                                style={[styles.requestLeaveButton, { backgroundColor: theme.colors.primary }]}
                                labelStyle={{ color: '#FFFFFF' }}
                            >
                                Request Leave
                            </Button>
                        </Card.Content>
                    </Card>

                    {/* Pending Requests */}
                    {pendingRequestsCount > 0 && (
                        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('Requests')}
                                    style={styles.pendingRequestsContainer}
                                >
                                    <View style={styles.pendingRequestsInfo}>
                                        <Text style={[styles.pendingRequestsTitle, { color: theme.colors.text }]}>
                                            Pending Requests
                                        </Text>
                                        <Text
                                            style={[styles.pendingRequestsCount, { color: theme.colors.textSecondary }]}
                                        >
                                            {pendingRequestsCount} {pendingRequestsCount === 1 ? 'request' : 'requests'}
                                        </Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                                        <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                                            {pendingRequestsCount}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Quick Links */}
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Links</Text>
                            <View style={styles.quickLinksGrid}>
                                <TouchableOpacity
                                    style={[styles.quickLinkDesktop, { backgroundColor: theme.colors.primary + '10' }]}
                                    onPress={() => navigation.navigate('Attendance')}
                                >
                                    <MaterialCommunityIcons
                                        name="calendar-clock"
                                        size={24}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={[styles.quickLinkTextDesktop, { color: theme.colors.text }]}>
                                        Attendance
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.quickLinkDesktop, { backgroundColor: theme.colors.primary + '10' }]}
                                    onPress={() => navigation.navigate('Payroll')}
                                >
                                    <MaterialCommunityIcons name="cash" size={24} color={theme.colors.primary} />
                                    <Text style={[styles.quickLinkTextDesktop, { color: theme.colors.text }]}>
                                        Payroll
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.quickLinkDesktop, { backgroundColor: theme.colors.primary + '10' }]}
                                    onPress={() => navigation.navigate('Profile')}
                                >
                                    <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                                    <Text style={[styles.quickLinkTextDesktop, { color: theme.colors.text }]}>
                                        Profile
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.quickLinkDesktop, { backgroundColor: theme.colors.primary + '10' }]}
                                    onPress={() => navigation.navigate('Requests')}
                                >
                                    <MaterialCommunityIcons
                                        name="file-document"
                                        size={24}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={[styles.quickLinkTextDesktop, { color: theme.colors.text }]}>
                                        Requests
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Card.Content>
                    </Card>
                </View>
            </View>
        </ScrollView>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const content = isLargeScreen ? renderDesktopLayout() : renderMobileLayout();

    return content;
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
    content: {
        padding: Spacing.md,
    },
    desktopContent: {
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    desktopHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    greeting: {
        ...Typography.caption,
    },
    name: {
        ...Typography.h3,
    },
    desktopName: {
        ...Typography.h2,
        fontWeight: '700',
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    cardTitle: {
        ...Typography.h5,
        fontWeight: '700',
    },
    viewAllText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: Spacing.md,
    },
    statusItem: {
        alignItems: 'center',
    },
    statusLabel: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
    },
    statusValue: {
        ...Typography.h4,
        fontWeight: '700',
    },
    actionButton: {
        borderRadius: BorderRadius.md,
    },
    actionButtonContent: {
        height: 48,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    statCard: {
        flex: 1,
        marginHorizontal: Spacing.xs,
        borderRadius: BorderRadius.lg,
        ...Shadows.small,
    },
    desktopStatsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    desktopStatCard: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    statInfo: {
        flex: 1,
    },
    statValue: {
        ...Typography.h5,
        fontWeight: '700',
        marginTop: Spacing.xs,
    },
    desktopStatValue: {
        ...Typography.h3,
        fontWeight: '700',
    },
    statLabel: {
        ...Typography.caption,
    },
    desktopGrid: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    desktopLeftColumn: {
        flex: 2,
    },
    desktopRightColumn: {
        flex: 1,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 200,
        marginTop: Spacing.lg,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    barWrapper: {
        height: 150,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: 40,
        borderRadius: BorderRadius.sm,
    },
    barLabel: {
        ...Typography.caption,
        marginTop: Spacing.xs,
    },
    barValue: {
        ...Typography.caption,
        fontWeight: '600',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    activityInfo: {
        marginLeft: Spacing.sm,
        flex: 1,
    },
    activityText: {
        ...Typography.body,
        fontWeight: '600',
    },
    activityDate: {
        ...Typography.caption,
    },
    leaveItem: {
        marginBottom: Spacing.md,
    },
    leaveInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    leaveType: {
        ...Typography.body,
        fontWeight: '600',
    },
    leaveDays: {
        ...Typography.caption,
    },
    leaveProgress: {
        height: 6,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    leaveProgressBar: {
        height: '100%',
    },
    requestLeaveButton: {
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    pendingRequestsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pendingRequestsInfo: {
        flex: 1,
    },
    pendingRequestsTitle: {
        ...Typography.h5,
        marginBottom: Spacing.xs,
    },
    pendingRequestsCount: {
        ...Typography.caption,
    },
    badge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        ...Typography.h5,
        fontWeight: '700',
    },
    quickLinksContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    quickLink: {
        width: '48%',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
        ...Shadows.small,
    },
    quickLinkIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    quickLinkText: {
        ...Typography.body,
        fontWeight: '600',
    },
    quickLinksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    quickLinkDesktop: {
        flex: 1,
        minWidth: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    quickLinkTextDesktop: {
        ...Typography.body,
        fontWeight: '600',
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
});
