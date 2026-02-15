import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Alert,
} from 'react-native';
import { Card, Title } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';

export default function AnalyticsScreen() {
    const { theme } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const [summary, setSummary] = useState({
        totalRevenue: 0,
        activeStores: 0,
        userGrowth: 0,
    });

    const [storeStatus, setStoreStatus] = useState({
        active: 0,
        inactive: 0,
    });

    const [roleDistribution, setRoleDistribution] = useState<{ role: string; count: number }[]>([]);
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [monthlyGrowth, setMonthlyGrowth] = useState<{ month: string; count: number }[]>([]);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            await Promise.all([
                loadSummary(),
                loadStoreStatus(),
                loadRoleDistribution(),
                loadRecentUsers(),
                loadMonthlyGrowth(),
            ]);
        } catch (error) {
            console.error('Error loading analytics:', error);
            Alert.alert('Error', 'Failed to load analytics data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadSummary = async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [revenueData, activeStoresData, growthData] = await Promise.all([
            supabase.from('subscription_plans').select('price_monthly'),
            supabase.from('stores').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
        ]);

        let totalRevenue = 0;
        if (revenueData.data) {
            totalRevenue = revenueData.data.reduce((sum: number, plan: any) => sum + (plan.price_monthly || 0), 0);
        }

        setSummary({
            totalRevenue,
            activeStores: activeStoresData.count || 0,
            userGrowth: growthData.count || 0,
        });
    };

    const loadStoreStatus = async () => {
        const [activeRes, totalRes] = await Promise.all([
            supabase.from('stores').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('stores').select('*', { count: 'exact', head: true }),
        ]);

        const active = activeRes.count || 0;
        const total = totalRes.count || 0;
        setStoreStatus({
            active,
            inactive: total - active,
        });
    };

    const loadRoleDistribution = async () => {
        const roles = ['store_owner', 'hr_team', 'employee', 'super_admin'];
        const results = await Promise.all(
            roles.map(role =>
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role)
            )
        );

        const distribution = roles.map((role, i) => ({
            role,
            count: results[i].count || 0,
        }));

        setRoleDistribution(distribution);
    };

    const loadRecentUsers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setRecentUsers(data);
        }
    };

    const loadMonthlyGrowth = async () => {
        const months: { month: string; count: number }[] = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const monthLabel = start.toLocaleString('default', { month: 'short', year: '2-digit' });

            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', start.toISOString())
                .lte('created_at', end.toISOString());

            months.push({ month: monthLabel, count: count || 0 });
        }

        setMonthlyGrowth(months);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadAllData();
    }, []);

    const formatRole = (role: string) => {
        return role
            ?.replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Unknown';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const roleColors: Record<string, string> = {
        store_owner: theme.colors.primary,
        hr_team: '#3B82F6',
        employee: '#10B981',
        super_admin: '#EF4444',
    };

    const maxRoleCount = Math.max(...roleDistribution.map(r => r.count), 1);
    const maxMonthCount = Math.max(...monthlyGrowth.map(m => m.count), 1);
    const totalStores = storeStatus.active + storeStatus.inactive;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[theme.colors.primary]}
                    tintColor={theme.colors.primary}
                />
            }
        >
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.headerContent}>
                    <Title style={styles.headerTitle}>Analytics</Title>
                    <Text style={styles.headerSubtitle}>Platform Insights & Metrics</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="stats-chart" size={36} color="white" />
                </View>
            </View>

            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderLeftColor: '#10B981' }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={28} color="#10B981" />
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>SAR {summary.totalRevenue.toLocaleString()}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Revenue</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderLeftColor: '#3B82F6' }]}>
                    <Ionicons name="business" size={28} color="#3B82F6" />
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.activeStores}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Active Stores</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.primary }]}>
                    <Ionicons name="trending-up" size={28} color={theme.colors.primary} />
                    <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.userGrowth}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>User Growth (30d)</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Store Status</Text>
            </View>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.barRow}>
                        <Text style={[styles.barLabel, { color: theme.colors.text }]}>Active</Text>
                        <View style={[styles.barTrack, { backgroundColor: theme.colors.background }]}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: totalStores > 0 ? `${(storeStatus.active / totalStores) * 100}%` : '0%',
                                        backgroundColor: '#10B981',
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.barCount, { color: theme.colors.text }]}>{storeStatus.active}</Text>
                    </View>
                    <View style={styles.barRow}>
                        <Text style={[styles.barLabel, { color: theme.colors.text }]}>Inactive</Text>
                        <View style={[styles.barTrack, { backgroundColor: theme.colors.background }]}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: totalStores > 0 ? `${(storeStatus.inactive / totalStores) * 100}%` : '0%',
                                        backgroundColor: '#EF4444',
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.barCount, { color: theme.colors.text }]}>{storeStatus.inactive}</Text>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>User Distribution by Role</Text>
            </View>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    {roleDistribution.map((item, index) => (
                        <View key={index} style={styles.barRow}>
                            <Text style={[styles.barLabel, { color: theme.colors.text }]}>{formatRole(item.role)}</Text>
                            <View style={[styles.barTrack, { backgroundColor: theme.colors.background }]}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${(item.count / maxRoleCount) * 100}%`,
                                            backgroundColor: roleColors[item.role] || theme.colors.textSecondary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.barCount, { color: theme.colors.text }]}>{item.count}</Text>
                        </View>
                    ))}
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Ionicons name="bar-chart" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Monthly Growth</Text>
            </View>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    {monthlyGrowth.map((item, index) => (
                        <View key={index} style={styles.barRow}>
                            <Text style={[styles.barLabel, { width: 70, color: theme.colors.text }]}>{item.month}</Text>
                            <View style={[styles.barTrack, { backgroundColor: theme.colors.background }]}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${(item.count / maxMonthCount) * 100}%`,
                                            backgroundColor: theme.colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.barCount, { color: theme.colors.text }]}>{item.count}</Text>
                        </View>
                    ))}
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Ionicons name="person-add" size={20} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Registrations</Text>
            </View>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    {recentUsers.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No recent registrations</Text>
                    ) : (
                        recentUsers.map((user, index) => (
                            <View
                                key={user.id || index}
                                style={[
                                    styles.userItem,
                                    { borderBottomColor: theme.colors.divider },
                                    index === recentUsers.length - 1 && styles.userItemLast,
                                ]}
                            >
                                <View style={styles.userAvatar}>
                                    <Ionicons name="person-circle" size={36} color={roleColors[user.role] || theme.colors.textSecondary} />
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={[styles.userName, { color: theme.colors.text }]}>{user.full_name || 'Unknown'}</Text>
                                    <View style={styles.userMeta}>
                                        <View style={[styles.roleBadge, { backgroundColor: (roleColors[user.role] || theme.colors.textSecondary) + '20' }]}>
                                            <Text style={[styles.roleBadgeText, { color: roleColors[user.role] || theme.colors.textSecondary }]}>
                                                {formatRole(user.role)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.userDate, { color: theme.colors.textSecondary }]}>{formatDate(user.created_at)}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </Card.Content>
            </Card>

            <View style={{ height: 30 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'white',
        opacity: 0.9,
        fontSize: 14,
        marginTop: 2,
    },
    headerIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingTop: 12,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 4,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderLeftWidth: 4,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 6,
    },
    summaryLabel: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8,
    },
    card: {
        marginHorizontal: 12,
        marginBottom: 4,
        elevation: 2,
        borderRadius: 14,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    barLabel: {
        width: 90,
        fontSize: 13,
        fontWeight: '500',
    },
    barTrack: {
        flex: 1,
        height: 22,
        borderRadius: 11,
        overflow: 'hidden',
        marginHorizontal: 8,
    },
    barFill: {
        height: '100%',
        borderRadius: 11,
        minWidth: 4,
    },
    barCount: {
        width: 36,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    userItemLast: {
        borderBottomWidth: 0,
    },
    userAvatar: {
        marginRight: 10,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
    },
    userMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    roleBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    userDate: {
        fontSize: 12,
    },
});
