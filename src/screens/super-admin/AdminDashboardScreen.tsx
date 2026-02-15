import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

export default function AdminDashboardScreen({ navigation }: any) {
    const [stats, setStats] = useState({
        totalStores: 0,
        totalUsers: 0,
        totalEmployees: 0,
        activeSubscriptions: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [stores, users, employees] = await Promise.all([
                supabase.from('stores').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('employees').select('*', { count: 'exact', head: true }),
            ]);

            setStats({
                totalStores: stores.count || 0,
                totalUsers: users.count || 0,
                totalEmployees: employees.count || 0,
                activeSubscriptions: stores.count || 0, // Placeholder
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const StatCard = ({ title, value, icon, color, onPress }: any) => (
        <TouchableOpacity onPress={onPress} style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statTitle}>{title}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStats} />}
        >
            <View style={styles.header}>
                <Title style={styles.headerTitle}>Super Admin Dashboard</Title>
                <Paragraph style={styles.headerSubtitle}>Platform Overview</Paragraph>
            </View>

            <View style={styles.statsGrid}>
                <StatCard
                    title="Total Stores"
                    value={stats.totalStores}
                    icon="business"
                    color={Colors.primary}
                    onPress={() => navigation.navigate('StoreManagement')}
                />
                <StatCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon="people"
                    color={Colors.success}
                    onPress={() => navigation.navigate('UserManagement')}
                />
                <StatCard
                    title="Total Employees"
                    value={stats.totalEmployees}
                    icon="person"
                    color={Colors.warning}
                    onPress={() => { }}
                />
                <StatCard
                    title="Active Subscriptions"
                    value={stats.activeSubscriptions}
                    icon="card"
                    color={Colors.info}
                    onPress={() => navigation.navigate('Subscriptions')}
                />
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Title>Quick Actions</Title>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('StoreManagement')}
                    >
                        <Ionicons name="business" size={24} color={Colors.primary} />
                        <Text style={styles.actionText}>Manage Stores</Text>
                        <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('UserManagement')}
                    >
                        <Ionicons name="people" size={24} color={Colors.success} />
                        <Text style={styles.actionText}>Manage Users</Text>
                        <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('SystemSettings')}
                    >
                        <Ionicons name="settings" size={24} color={Colors.warning} />
                        <Text style={styles.actionText}>System Settings</Text>
                        <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => navigation.navigate('Analytics')}
                    >
                        <Ionicons name="stats-chart" size={24} color={Colors.info} />
                        <Text style={styles.actionText}>View Analytics</Text>
                        <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 20,
        backgroundColor: Colors.primary,
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
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        margin: '1%',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
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
        color: Colors.text,
    },
    statTitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    card: {
        margin: 10,
        elevation: 2,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    actionText: {
        flex: 1,
        marginLeft: 15,
        fontSize: 16,
        color: Colors.text,
    },
});
