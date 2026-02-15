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
import { Colors } from '../../constants/theme';

export default function AnalyticsScreen() {
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
        store_owner: Colors.primary,
        hr_team: Colors.info,
        employee: Colors.success,
        super_admin: Colors.error,
    };

    const maxRoleCount = Math.max(...roleDistribution.map(r => r.count), 1);
    const maxMonthCount = Math.max(...monthlyGrowth.map(m => m.count), 1);
    const totalStores = storeStatus.active + storeStatus.inactive;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Title style={styles.headerTitle}>Analytics</Title>
                    <Text style={styles.headerSubtitle}>Platform Insights & Metrics</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="stats-chart" size={36} color={Colors.white} />
                </View>
            </View>

            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderLeftColor: Colors.success }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={28} color={Colors.success} />
                    <Text style={styles.summaryValue}>${summary.totalRevenue.toLocaleString()}</Text>
                    <Text style={styles.summaryLabel}>Total Revenue</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: Colors.info }]}>
                    <Ionicons name="business" size={28} color={Colors.info} />
                    <Text style={styles.summaryValue}>{summary.activeStores}</Text>
                    <Text style={styles.summaryLabel}>Active Stores</Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: Colors.primary }]}>
                    <Ionicons name="trending-up" size={28} color={Colors.primary} />
                    <Text style={styles.summaryValue}>{summary.userGrowth}</Text>
                    <Text style={styles.summaryLabel}>User Growth (30d)</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Ionicons name="pie-chart" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Store Status</Text>
            </View>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.barRow}>
                        <Text style={styles.barLabel}>Active</Text>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: totalStores > 0 ? `${(storeStatus.active / totalStores) * 100}%` : '0%',
                                        backgroundColor: Colors.success,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.barCount}>{storeStatus.active}</Text>
                    </View>
                    <View style={styles.barRow}>
                        <Text style={styles.barLabel}>Inactive</Text>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: totalStores > 0 ? `${(storeStatus.inactive / totalStores) * 100}%` : '0%',
                                        backgroundColor: Colors.error,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.barCount}>{storeStatus.inactive}</Text>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Ionicons name="people" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>User Distribution by Role</Text>
            </View>
            <Card style={styles.card}>
                <Card.Content>
                    {roleDistribution.map((item, index) => (
                        <View key={index} style={styles.barRow}>
                            <Text style={styles.barLabel}>{formatRole(item.role)}</Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${(item.count / maxRoleCount) * 100}%`,
                                            backgroundColor: roleColors[item.role] || Colors.textSecondary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barCount}>{item.count}</Text>
                        </View>
                    ))}
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Ionicons name="bar-chart" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Monthly Growth</Text>
            </View>
            <Card style={styles.card}>
                <Card.Content>
                    {monthlyGrowth.map((item, index) => (
                        <View key={index} style={styles.barRow}>
                            <Text style={[styles.barLabel, { width: 70 }]}>{item.month}</Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            width: `${(item.count / maxMonthCount) * 100}%`,
                                            backgroundColor: Colors.primary,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.barCount}>{item.count}</Text>
                        </View>
                    ))}
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Ionicons name="person-add" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Recent Registrations</Text>
            </View>
            <Card style={styles.card}>
                <Card.Content>
                    {recentUsers.length === 0 ? (
                        <Text style={styles.emptyText}>No recent registrations</Text>
                    ) : (
                        recentUsers.map((user, index) => (
                            <View
                                key={user.id || index}
                                style={[
                                    styles.userItem,
                                    index === recentUsers.length - 1 && styles.userItemLast,
                                ]}
                            >
                                <View style={styles.userAvatar}>
                                    <Ionicons name="person-circle" size={36} color={roleColors[user.role] || Colors.textSecondary} />
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{user.full_name || 'Unknown'}</Text>
                                    <View style={styles.userMeta}>
                                        <View style={[styles.roleBadge, { backgroundColor: (roleColors[user.role] || Colors.textSecondary) + '20' }]}>
                                            <Text style={[styles.roleBadgeText, { color: roleColors[user.role] || Colors.textSecondary }]}>
                                                {formatRole(user.role)}
                                            </Text>
                                        </View>
                                        <Text style={styles.userDate}>{formatDate(user.created_at)}</Text>
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
        backgroundColor: Colors.background,
    },
    header: {
        padding: 24,
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        color: Colors.white,
        fontSize: 26,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: Colors.white,
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
        backgroundColor: Colors.white,
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
        color: Colors.text,
        marginTop: 6,
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
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
        color: Colors.text,
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
        color: Colors.text,
        fontWeight: '500',
    },
    barTrack: {
        flex: 1,
        height: 22,
        backgroundColor: Colors.background,
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
        color: Colors.text,
        textAlign: 'right',
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        paddingVertical: 20,
        fontSize: 14,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
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
        color: Colors.text,
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
        color: Colors.textSecondary,
    },
});
