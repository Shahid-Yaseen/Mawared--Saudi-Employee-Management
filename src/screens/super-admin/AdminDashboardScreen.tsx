import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

export default function AdminDashboardScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [stats, setStats] = useState({
        totalStores: 0,
        activeStores: 0,
        totalUsers: 0,
        totalEmployees: 0,
        activeSubscriptions: 0,
        pendingRequests: 0,
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    const { useFocusEffect } = require('@react-navigation/native');

    useFocusEffect(
        useCallback(() => {
            console.log('AdminDashboard focused, loading data...');
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            await Promise.all([loadStats(), loadRecentActivity()]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            Alert.alert('Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadStats = async () => {
        try {
            console.log('Loading dashboard stats via admin API...');
            const result = await adminApi.getStats();
            if (result.success && result.stats) {
                setStats(result.stats);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            // Fallback empty stats already set
        }
    };

    const loadRecentActivity = async () => {
        try {
            const result = await adminApi.getRecentActivity();
            if (result.success && result.activity) {
                setRecentActivity(result.activity);
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffWeeks < 4) return `${diffWeeks}w ago`;
        return `${diffMonths}mo ago`;
    };

    const formatRole = (role: string) => {
        return role
            ?.replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Unknown';
    };

    const statCards = [
        { title: 'Total Stores', value: stats.totalStores, icon: 'business' as const, color: theme.colors.primary },
        { title: 'Active Stores', value: stats.activeStores, icon: 'checkmark-circle' as const, color: '#10B981' },
        { title: 'Total Users', value: stats.totalUsers, icon: 'people' as const, color: '#3B82F6' },
        { title: 'Total Employees', value: stats.totalEmployees, icon: 'person' as const, color: '#F59E0B' },
        { title: 'Active Subscriptions', value: stats.activeSubscriptions, icon: 'card' as const, color: '#8B5CF6' },
        { title: 'Pending Requests', value: stats.pendingRequests, icon: 'time' as const, color: '#EF4444' },
    ];

    const quickActions = [
        { title: 'Add Store Owner', icon: 'person-add' as const, color: theme.colors.primary, route: 'AddStoreOwner' },
        { title: 'Manage Stores', icon: 'business' as const, color: '#10B981', route: 'StoreManagement' },
        { title: 'Manage Users', icon: 'people' as const, color: '#3B82F6', route: 'UserManagement' },
        { title: 'Subscription Plans', icon: 'card' as const, color: '#8B5CF6', route: 'Subscriptions' },
        { title: 'System Settings', icon: 'settings' as const, color: '#F59E0B', route: 'SystemSettings' },
        { title: 'Analytics', icon: 'stats-chart' as const, color: '#EF4444', route: 'Analytics' },
    ];

    const StatCard = ({ title, value, icon, color }: any) => (
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
        </View>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Title style={styles.headerTitle}>Super Admin Dashboard</Title>
                    <Paragraph style={styles.headerSubtitle}>Platform Overview & Management</Paragraph>
                </View>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="shield-crown" size={40} color="white" />
                </View>
            </View>

            <View style={styles.statsGrid}>
                {statCards.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </View>

            <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={22} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            </View>
            <View style={styles.actionsGrid}>
                {quickActions.map((action, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                        onPress={() => navigation.navigate(action.route)}
                    >
                        <View style={[styles.actionIconContainer, { backgroundColor: action.color + '15' }]}>
                            <Ionicons name={action.icon as any} size={26} color={action.color} />
                        </View>
                        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>{action.title}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.sectionHeader}>
                <Ionicons name="time" size={22} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            </View>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    {recentActivity.length === 0 ? (
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No recent activity</Text>
                    ) : (
                        recentActivity.map((item, index) => (
                            <View
                                key={item.id || index}
                                style={[
                                    styles.activityItem,
                                    { borderBottomColor: theme.colors.divider },
                                    index === recentActivity.length - 1 && styles.activityItemLast,
                                ]}
                            >
                                <View style={styles.activityAvatar}>
                                    <Ionicons name="person-circle" size={40} color={theme.colors.primary} />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={[styles.activityName, { color: theme.colors.text }]}>
                                        {item.full_name || 'Unknown User'}
                                    </Text>
                                    <Text style={[styles.activityRole, { color: theme.colors.textSecondary }]}>
                                        {formatRole(item.role)}
                                    </Text>
                                </View>
                                <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                                    Joined {getTimeAgo(item.created_at)}
                                </Text>
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
        backgroundColor: '#D4AF37',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContent: {
        flex: 1,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        marginTop: 4,
    },
    statCard: {
        width: '47%',
        borderRadius: 14,
        padding: 16,
        margin: '1.5%',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    statTitle: {
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
    },
    actionCard: {
        width: '47%',
        borderRadius: 14,
        padding: 16,
        margin: '1.5%',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 6,
    },
    card: {
        marginHorizontal: 12,
        marginBottom: 8,
        elevation: 2,
        borderRadius: 14,
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    activityItemLast: {
        borderBottomWidth: 0,
    },
    activityAvatar: {
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityName: {
        fontSize: 15,
        fontWeight: '600',
    },
    activityRole: {
        fontSize: 13,
        marginTop: 2,
    },
    activityTime: {
        fontSize: 12,
    },
});
