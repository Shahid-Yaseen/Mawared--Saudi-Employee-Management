import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    useWindowDimensions,
    TouchableOpacity,
} from 'react-native';
import { Card, Searchbar, Avatar, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import SidebarLayout from '../../components/SidebarLayout';

export default function StoreOwnerDashboardScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState<{
        totalEmployees: number;
        presentToday: number;
        onLeaveToday: number;
        pendingApprovals: number;
        attendanceRate: number;
        totalHours: number;
        avgCheckInTime: string;
        onTimeCount: number;
        lateCount: number;
        absentCount: number;
        onTimePercentage: number;
        latePercentage: number;
        absentPercentage: number;
        monthlyData: { month: string; value: number }[];
        topDepartments: string[];
        topEmployees: string[];
    }>({
        totalEmployees: 0,
        presentToday: 0,
        onLeaveToday: 0,
        pendingApprovals: 0,
        attendanceRate: 0,
        totalHours: 0,
        avgCheckInTime: '09:00',
        onTimeCount: 0,
        lateCount: 0,
        absentCount: 0,
        onTimePercentage: 0,
        latePercentage: 0,
        absentPercentage: 0,
        monthlyData: [
            { month: 'Oct', value: 0 },
            { month: 'Nov', value: 0 },
            { month: 'Dec', value: 0 },
        ],
        topDepartments: [],
        topEmployees: [],
    });

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
                const today = new Date().toISOString().split('T')[0];

                // Get total employees
                const { count: totalEmp } = await supabase
                    .from('employees')
                    .select('*', { count: 'exact', head: true })
                    .eq('store_id', storeData.id)
                    .eq('status', 'active');

                // Get today's attendance
                const { data: attendanceData, count: presentCount } = await supabase
                    .from('attendance')
                    .select('*, employees!inner(id, profiles!inner(full_name))')
                    .eq('date', today);

                // Calculate on-time, late, and absent
                const onTime = attendanceData?.filter(a => a.status === 'present' && !a.is_late).length || 0;
                const late = attendanceData?.filter(a => a.is_late).length || 0;
                const absent = (totalEmp || 0) - (presentCount || 0);

                // Get leave requests
                const { count: leaveCount } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'approved')
                    .lte('start_date', today)
                    .gte('end_date', today);

                const { count: pendingLeave } = await supabase
                    .from('leave_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');

                // Calculate total hours worked this month
                const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const { data: monthlyAttendance } = await supabase
                    .from('attendance')
                    .select('hours_worked')
                    .gte('date', firstDayOfMonth)
                    .lte('date', today);

                const totalHours = monthlyAttendance?.reduce((sum, record) => sum + (record.hours_worked || 0), 0) || 0;

                // Get monthly attendance data for chart (last 3 months)
                const months = ['Oct', 'Nov', 'Dec'];
                const monthlyData = await Promise.all(
                    months.map(async (month, index) => {
                        const monthNum = new Date().getMonth() - (2 - index);
                        const year = new Date().getFullYear();
                        const firstDay = new Date(year, monthNum, 1).toISOString().split('T')[0];
                        const lastDay = new Date(year, monthNum + 1, 0).toISOString().split('T')[0];

                        const { count } = await supabase
                            .from('attendance')
                            .select('*', { count: 'exact', head: true })
                            .gte('date', firstDay)
                            .lte('date', lastDay)
                            .eq('status', 'present');

                        return { month, value: count || 0 };
                    })
                );

                // Get top departments by employee count
                const { data: employees } = await supabase
                    .from('employees')
                    .select('department')
                    .eq('store_id', storeData.id)
                    .eq('status', 'active');

                const deptCounts: any = {};
                employees?.forEach(emp => {
                    if (emp.department) {
                        deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
                    }
                });

                const topDepartments = Object.entries(deptCounts)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .slice(0, 3)
                    .map(([name]) => name);

                // Get top employees (most attendance this month)
                const { data: topAttendance } = await supabase
                    .from('attendance')
                    .select('employee_id, employees!inner(profiles!inner(full_name))')
                    .gte('date', firstDayOfMonth)
                    .eq('status', 'present');

                const empCounts: any = {};
                topAttendance?.forEach((record: any) => {
                    const name = record.employees?.profiles?.full_name;
                    if (name) {
                        empCounts[name] = (empCounts[name] || 0) + 1;
                    }
                });

                const topEmployees = Object.entries(empCounts)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .slice(0, 3)
                    .map(([name]) => name);

                // Calculate average check-in time
                const checkInTimes = attendanceData?.map(a => a.check_in_time).filter(Boolean) || [];
                let avgCheckInTime = '09:00';
                if (checkInTimes.length > 0) {
                    const totalMinutes = checkInTimes.reduce((sum, time) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        return sum + (hours * 60) + minutes;
                    }, 0);
                    const avgMinutes = Math.floor(totalMinutes / checkInTimes.length);
                    const hours = Math.floor(avgMinutes / 60);
                    const mins = avgMinutes % 60;
                    avgCheckInTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                }

                const attendanceRate = totalEmp ? ((presentCount || 0) / totalEmp) * 100 : 0;
                const onTimePercentage = totalEmp ? (onTime / totalEmp) * 100 : 0;
                const latePercentage = totalEmp ? (late / totalEmp) * 100 : 0;
                const absentPercentage = totalEmp ? (absent / totalEmp) * 100 : 0;

                setStats({
                    totalEmployees: totalEmp || 0,
                    presentToday: presentCount || 0,
                    onLeaveToday: leaveCount || 0,
                    pendingApprovals: pendingLeave || 0,
                    attendanceRate,
                    totalHours: Math.round(totalHours),
                    avgCheckInTime,
                    onTimeCount: onTime,
                    lateCount: late,
                    absentCount: absent,
                    onTimePercentage,
                    latePercentage,
                    absentPercentage,
                    monthlyData,
                    topDepartments,
                    topEmployees,
                });
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderMobileLayout = () => (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            <View style={styles.mobileHeader}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.text }]}>Hello, Owner</Text>
                    <Text style={[styles.subGreeting, { color: theme.colors.textSecondary }]}>Welcome back to Mawared</Text>
                </View>
                <IconButton
                    icon="bell-outline"
                    size={24}
                    iconColor={theme.colors.textSecondary}
                    style={{ backgroundColor: theme.colors.surface }}
                />
            </View>

            {/* Main Stats Row */}
            <View style={styles.statsContainer}>
                <Card style={[styles.statCard, { backgroundColor: theme.colors.primary }]}>
                    <Card.Content>
                        <MaterialCommunityIcons name="account-group" size={20} color="rgba(255,255,255,0.7)" />
                        <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.totalEmployees}</Text>
                        <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>{t('dashboard.totalEmployees')}</Text>
                    </Card.Content>
                </Card>

                <Card style={[styles.statCard, { backgroundColor: theme.colors.success }]}>
                    <Card.Content>
                        <MaterialCommunityIcons name="clock-check" size={20} color="rgba(255,255,255,0.7)" />
                        <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{stats.presentToday}</Text>
                        <Text style={[styles.statLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>{t('dashboard.presentToday')}</Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Quick Actions Grid */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                    style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('AddEmployee')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                        <MaterialCommunityIcons name="account-plus" size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Add Staff</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Privacy')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: theme.colors.info + '15' }]}>
                        <MaterialCommunityIcons name="shield-lock" size={24} color={theme.colors.info} />
                    </View>
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Privacy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Approvals')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: theme.colors.success + '15' }]}>
                        <MaterialCommunityIcons name="check-decagram" size={24} color={theme.colors.success} />
                    </View>
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Approvals</Text>
                    {stats.pendingApprovals > 0 && (
                        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                            <Text style={styles.badgeText}>{stats.pendingApprovals}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={[styles.quickActionsGrid, { marginTop: Spacing.sm }]}>
                <TouchableOpacity
                    style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Employees')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: theme.colors.warning + '15' }]}>
                        <MaterialCommunityIcons name="clipboard-list" size={24} color={theme.colors.warning} />
                    </View>
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.quickAction, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('Settings')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                        <MaterialCommunityIcons name="cog" size={24} color={theme.colors.secondary} />
                    </View>
                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Settings</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />
            </View>

            {/* Attendance Analytics Card */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.mobileAnalyticsHeader}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>{t('dashboard.attendanceRate')}</Text>
                        <Text style={[styles.rateValueSmall, { color: theme.colors.primary }]}>{stats.attendanceRate.toFixed(1)}%</Text>
                    </View>

                    <View style={styles.miniBarChart}>
                        {stats.monthlyData.map((item, index) => (
                            <View key={index} style={styles.miniBarGroup}>
                                <View style={styles.miniBarWrapper}>
                                    <View style={[styles.miniBarBg, { backgroundColor: theme.colors.divider + '20' }]} />
                                    <View style={[styles.miniBar, { height: `${item.value}%`, backgroundColor: theme.colors.primary }]} />
                                </View>
                                <Text style={[styles.miniBarLabel, { color: theme.colors.textSecondary }]}>{item.month}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.progressBar, { backgroundColor: theme.colors.divider }]}>
                        <View style={[styles.progressFill, { width: `${stats.attendanceRate}%`, backgroundColor: theme.colors.primary }]} />
                    </View>
                </Card.Content>
            </Card>

            {/* Recent Activity Mini List */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.activityItem}>
                        <MaterialCommunityIcons name="circle" size={8} color={theme.colors.success} style={{ marginTop: 6 }} />
                        <View style={styles.activityInfo}>
                            <Text style={[styles.activityText, { color: theme.colors.text }]}>Attendance system updated</Text>
                            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>2 hours ago</Text>
                        </View>
                    </View>
                    <View style={[styles.activityDivider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.activityItem}>
                        <MaterialCommunityIcons name="circle" size={8} color={theme.colors.primary} style={{ marginTop: 6 }} />
                        <View style={styles.activityInfo}>
                            <Text style={[styles.activityText, { color: theme.colors.text }]}>New employee "Ahmed" joined</Text>
                            <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>Yesterday</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>
        </ScrollView>
    );

    const renderDesktopLayout = () => (
        <View style={[styles.desktopContainer, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                style={styles.desktopContent}
                contentContainerStyle={styles.desktopContentInner}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Header Section */}
                <View style={styles.desktopHeader}>
                    <Searchbar
                        placeholder="Search employee, tasks, reports..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                        inputStyle={{ color: theme.colors.text, fontSize: 14 }}
                        placeholderTextColor={theme.colors.textSecondary}
                        iconColor={theme.colors.sidebarIcon}
                    />
                    <View style={styles.headerActions}>
                        <IconButton
                            icon="bell-outline"
                            size={24}
                            iconColor={theme.colors.textSecondary}
                            style={{ backgroundColor: theme.colors.surface }}
                        />
                        <View style={styles.profileBadge}>
                            <Avatar.Text
                                size={40}
                                label="YN"
                                style={{ backgroundColor: theme.colors.primary }}
                                labelStyle={{ color: '#FFFFFF', fontWeight: '700' }}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.desktopGrid}>
                    {/* Left Main Content */}
                    <View style={styles.leftColumn}>
                        {/* Analytics Main Card */}
                        <Card style={[styles.analyticsCard, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <View style={styles.analyticsHeader}>
                                    <View>
                                        <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Analytics</Text>
                                        <Text style={[styles.analyticsSub, { color: theme.colors.textSecondary }]}>Employee performance & attendance</Text>
                                    </View>
                                    <View style={[styles.monthButton, { backgroundColor: theme.colors.primary }]}>
                                        <MaterialCommunityIcons name="calendar" size={16} color="#FFFFFF" />
                                        <Text style={[styles.monthButtonText, { color: '#FFFFFF' }]}>3 Months</Text>
                                    </View>
                                </View>

                                {/* Bar Chart Simulation */}
                                <View style={styles.chartContainer}>
                                    <View style={styles.chartYAxis}>
                                        {[100, 75, 50, 25, 0].map(val => (
                                            <Text key={val} style={[styles.yAxisLabel, { color: theme.colors.textSecondary }]}>{val}</Text>
                                        ))}
                                    </View>
                                    <View style={styles.chartArea}>
                                        <View style={styles.chartGrid}>
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <View key={i} style={[styles.gridLine, { backgroundColor: theme.colors.divider, opacity: 0.5 }]} />
                                            ))}
                                        </View>
                                        <View style={styles.barsContainer}>
                                            {stats.monthlyData.map((item, index) => (
                                                <View key={index} style={styles.barGroup}>
                                                    <View style={styles.barWrapper}>
                                                        <View style={[styles.barBack, { backgroundColor: theme.colors.divider + '40' }]} />
                                                        <View style={[styles.bar, { height: `${item.value}%`, backgroundColor: theme.colors.primary }]} />
                                                    </View>
                                                    <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>{item.month}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                {/* Bottom Statistics Row */}
                                <View style={styles.metricsGrid}>
                                    <View style={styles.metricsCol}>
                                        <View style={[styles.metricItem, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                                            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Employees</Text>
                                            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{stats.totalEmployees}</Text>
                                            <View style={[styles.sparklineContainer, { backgroundColor: theme.colors.divider }]}>
                                                <View style={[styles.sparkline, { backgroundColor: theme.colors.success }]} />
                                            </View>
                                        </View>
                                        <View style={[styles.metricItem, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                                            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Total Hours</Text>
                                            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{stats.totalHours}h</Text>
                                            <View style={[styles.sparklineContainer, { backgroundColor: theme.colors.divider }]}>
                                                <View style={[styles.sparkline, { backgroundColor: theme.colors.primary }]} />
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.metricsCol}>
                                        <View style={[styles.metricItem, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                                            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Attendance</Text>
                                            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{stats.attendanceRate.toFixed(0)}%</Text>
                                            <View style={[styles.sparklineContainer, { backgroundColor: theme.colors.divider }]}>
                                                <View style={[styles.sparkline, { backgroundColor: theme.colors.info }]} />
                                            </View>
                                        </View>
                                        <View style={[styles.metricItem, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                                            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Avg Check-In</Text>
                                            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{stats.avgCheckInTime}</Text>
                                            <View style={[styles.sparklineContainer, { backgroundColor: theme.colors.divider }]}>
                                                <View style={[styles.sparkline, { backgroundColor: theme.colors.warning }]} />
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Progress Circles Row */}
                                <View style={styles.progressCirclesRow}>
                                    <View style={styles.circleItem}>
                                        <View style={[styles.circle, { borderColor: theme.colors.primary }]}>
                                            <Text style={[styles.circleText, { color: theme.colors.text }]}>{stats.onTimePercentage.toFixed(0)}%</Text>
                                        </View>
                                        <Text style={[styles.circleLabel, { color: theme.colors.textSecondary }]}>On Time</Text>
                                        <Text style={[styles.circleValue, { color: theme.colors.text }]}>{stats.onTimeCount}</Text>
                                    </View>
                                    <View style={styles.circleItem}>
                                        <View style={[styles.circle, { borderColor: '#9C27B0' }]}>
                                            <Text style={[styles.circleText, { color: theme.colors.text }]}>{stats.latePercentage.toFixed(0)}%</Text>
                                        </View>
                                        <Text style={[styles.circleLabel, { color: theme.colors.textSecondary }]}>Late</Text>
                                        <Text style={[styles.circleValue, { color: theme.colors.text }]}>{stats.lateCount}</Text>
                                    </View>
                                    <View style={styles.circleItem}>
                                        <View style={[styles.circle, { borderColor: theme.colors.info }]}>
                                            <Text style={[styles.circleText, { color: theme.colors.text }]}>{stats.absentPercentage.toFixed(0)}%</Text>
                                        </View>
                                        <Text style={[styles.circleLabel, { color: theme.colors.textSecondary }]}>Absent</Text>
                                        <Text style={[styles.circleValue, { color: theme.colors.text }]}>{stats.absentCount}</Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Right Column Section */}
                    <View style={styles.rightColumn}>
                        <Card style={[styles.sideCard, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <Text style={[styles.sideCardTitle, { color: theme.colors.text }]}>Trending Now</Text>
                                <View style={styles.pillContainer}>
                                    <View style={[styles.pill, { backgroundColor: theme.colors.divider }]}>
                                        <Text style={[styles.pillText, { color: theme.colors.textSecondary }]}>All-In</Text>
                                    </View>
                                    <View style={[styles.pill, { backgroundColor: theme.colors.primary }]}>
                                        <Text style={[styles.pillText, { color: '#FFFFFF' }]}>Top Performers</Text>
                                    </View>
                                </View>

                                <View style={styles.secondaryActivity}>
                                    <Text style={[styles.activityTitle, { color: theme.colors.text }]}>Productivity Rate</Text>
                                    <View style={styles.statBoxes}>
                                        <View style={styles.statBox}>
                                            <Text style={[styles.statNum, { color: theme.colors.text }]}>{stats.presentToday}</Text>
                                            <Text style={[styles.statDesc, { color: theme.colors.textSecondary }]}>Present</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={[styles.statNum, { color: theme.colors.text }]}>{stats.onLeaveToday}</Text>
                                            <Text style={[styles.statDesc, { color: theme.colors.textSecondary }]}>On Leave</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={[styles.statNum, { color: theme.colors.text }]}>{stats.absentCount}</Text>
                                            <Text style={[styles.statDesc, { color: theme.colors.textSecondary }]}>Absent</Text>
                                        </View>
                                    </View>

                                    {/* Mini Line Chart simulation */}
                                    <View style={styles.lineChartArea}>
                                        <View style={[styles.lineChart, { borderBottomColor: theme.colors.primary }]} />
                                        <View style={styles.lineChartLabels}>
                                            <Text style={[styles.lineLabel, { color: theme.colors.textSecondary }]}>06:00</Text>
                                            <Text style={[styles.lineLabel, { color: theme.colors.textSecondary }]}>12:00</Text>
                                            <Text style={[styles.lineLabel, { color: theme.colors.textSecondary }]}>18:00</Text>
                                        </View>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>

                        <Card style={[styles.sideCard, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <View style={styles.listSection}>
                                    <View style={styles.listCol}>
                                        <Text style={[styles.listHeader, { color: theme.colors.text }]}>Top Departments</Text>
                                        {stats.topDepartments.length > 0 ? (
                                            stats.topDepartments.map((dept, idx) => (
                                                <Text key={idx} style={[styles.listItem, { color: theme.colors.textSecondary }]}>{idx + 1}. {dept}</Text>
                                            ))
                                        ) : (
                                            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>No data</Text>
                                        )}
                                    </View>
                                    <View style={styles.listCol}>
                                        <Text style={[styles.listHeader, { color: theme.colors.text }]}>Top Staff</Text>
                                        {stats.topEmployees.length > 0 ? (
                                            stats.topEmployees.map((emp, idx) => (
                                                <Text key={idx} style={[styles.listItem, { color: theme.colors.textSecondary }]}>{idx + 1}. {emp}</Text>
                                            ))
                                        ) : (
                                            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>No data</Text>
                                        )}
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    </View>
                </View>
            </ScrollView>
        </View>
    );

    return (
        <SidebarLayout navigation={navigation} activeRoute="Dashboard">
            {isLargeScreen ? renderDesktopLayout() : renderMobileLayout()}
        </SidebarLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
    },
    mobileHeader: {
        marginBottom: Spacing.lg,
    },
    greeting: {
        ...Typography.h3,
        fontWeight: '800',
    },
    subGreeting: {
        ...Typography.body,
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    statCard: {
        flex: 1,
        borderRadius: BorderRadius.xl,
        ...Shadows.medium,
    },
    statValue: {
        ...Typography.h2,
        fontWeight: '800',
    },
    statLabel: {
        ...Typography.small,
        fontWeight: '600',
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.xl,
        ...Shadows.medium,
    },
    cardTitle: {
        ...Typography.h5,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    rateContainer: {
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    rateValue: {
        ...Typography.h1,
        fontWeight: '800',
    },
    rateLabel: {
        ...Typography.caption,
        marginTop: 4,
    },
    progressBar: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },

    // Desktop Styles
    desktopContainer: {
        flex: 1,
    },
    desktopContent: {
        flex: 1,
    },
    desktopContentInner: {
        padding: 40,
    },
    desktopHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
        gap: 20,
    },
    searchBar: {
        flex: 1,
        maxWidth: 500,
        borderRadius: 14,
        elevation: 0,
        height: 50,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    profileBadge: {
        marginLeft: 8,
    },
    desktopGrid: {
        flexDirection: 'row',
        gap: 32,
    },
    leftColumn: {
        flex: 2.2,
    },
    rightColumn: {
        flex: 1,
        gap: 24,
    },
    analyticsCard: {
        borderRadius: 24,
        padding: 12,
        ...Shadows.large,
    },
    analyticsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    analyticsTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    analyticsSub: {
        fontSize: 14,
        marginTop: 4,
    },
    monthButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    monthButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    chartContainer: {
        flexDirection: 'row',
        height: 240,
        marginBottom: 40,
    },
    chartYAxis: {
        width: 35,
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    yAxisLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    chartArea: {
        flex: 1,
        position: 'relative',
        marginLeft: 10,
    },
    chartGrid: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 10,
        justifyContent: 'space-between',
    },
    gridLine: {
        height: 1,
    },
    barsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: '100%',
        zIndex: 1,
    },
    barGroup: {
        alignItems: 'center',
        width: 60,
    },
    barWrapper: {
        height: '100%',
        width: 12,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    barBack: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 6,
    },
    bar: {
        width: '100%',
        borderRadius: 6,
    },
    barLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 12,
    },
    metricsGrid: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 40,
    },
    metricsCol: {
        flex: 1,
        gap: 16,
    },
    metricItem: {
        flexDirection: 'column',
        padding: 20,
        borderRadius: 16,
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    sparklineContainer: {
        height: 4,
        marginTop: 12,
        borderRadius: 2,
        overflow: 'hidden',
    },
    sparkline: {
        width: '60%',
        height: '100%',
    },
    progressCirclesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 20,
    },
    circleItem: {
        alignItems: 'center',
    },
    circle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    circleText: {
        fontSize: 18,
        fontWeight: '800',
    },
    circleLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    circleValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    sideCard: {
        borderRadius: 24,
        ...Shadows.large,
    },
    sideCardTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20,
    },
    pillContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    secondaryActivity: {
        marginTop: 8,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 20,
    },
    statBoxes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statBox: {
        alignItems: 'center',
    },
    statNum: {
        fontSize: 22,
        fontWeight: '800',
    },
    statDesc: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    lineChartArea: {
        height: 120,
        paddingTop: 20,
    },
    lineChart: {
        height: 60,
        borderBottomWidth: 3,
        borderRadius: 10,
    },
    lineChartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    lineLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    listSection: {
        flexDirection: 'row',
        gap: 20,
    },
    listCol: {
        flex: 1,
    },
    listHeader: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 16,
    },
    listItem: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
    },
    // Enhanced Mobile Styles
    sectionTitle: {
        ...Typography.h5,
        fontWeight: '700',
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    quickAction: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.small,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    actionText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    mobileAnalyticsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    rateValueSmall: {
        ...Typography.h4,
        fontWeight: '800',
    },
    miniBarChart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 100,
        marginBottom: Spacing.lg,
        alignItems: 'flex-end',
    },
    miniBarGroup: {
        alignItems: 'center',
        flex: 1,
    },
    miniBarWrapper: {
        width: 12,
        height: 60,
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    miniBarBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    miniBar: {
        width: '100%',
        borderRadius: 6,
    },
    miniBarLabel: {
        ...Typography.caption,
        fontSize: 10,
        marginTop: 4,
    },
    activityItem: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    activityInfo: {
        flex: 1,
    },
    activityText: {
        ...Typography.body,
        fontSize: 14,
    },
    activityTime: {
        ...Typography.caption,
        marginTop: 2,
    },
    activityDivider: {
        height: 1,
        marginVertical: Spacing.sm,
    },
});
