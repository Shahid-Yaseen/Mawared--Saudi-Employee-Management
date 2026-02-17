import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { supabase, signOut } from '../services/supabase';

interface SidebarLayoutProps {
    children: React.ReactNode;
    navigation: any;
    activeRoute: string;
    role?: 'employee' | 'store_owner' | 'hr_team' | 'super_admin';
}

export default function SidebarLayout({ children, navigation, activeRoute, role = 'store_owner' }: SidebarLayoutProps) {
    const { theme, isDark, setMode } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to logout?');
            if (confirmed) {
                try {
                    await signOut();
                } catch (e) {
                    console.error('Logout failed:', e);
                }
            }
        } else {
            const { Alert } = require('react-native');
            Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: async () => { try { await signOut(); } catch (e) { console.error('Logout failed:', e); } } },
                ]
            );
        }
    };

    const toggleTheme = () => {
        setMode(isDark ? 'light' : 'dark');
    };

    const getMenuItems = () => {
        switch (role) {
            case 'employee':
                return [
                    { name: 'Home', icon: 'home', route: 'Home' },
                    { name: 'Attendance', icon: 'clock-outline', route: 'Attendance' },
                    { name: 'Leave', icon: 'calendar', route: 'Leave' },
                    { name: 'Requests', icon: 'file-document', route: 'Requests' },
                    { name: 'Payroll', icon: 'cash', route: 'Payroll' },
                    { name: 'Profile', icon: 'account', route: 'Profile' },
                ];
            case 'hr_team':
                return [
                    { name: 'Dashboard', icon: 'view-dashboard', route: 'HRDashboard' },
                    { name: 'Employees', icon: 'account-group', route: 'EmployeeDirectory' },
                    { name: 'Approvals', icon: 'calendar-check', route: 'LeaveApprovals' },
                    { name: 'Payroll', icon: 'cash', route: 'PayrollOverview' },
                    { name: 'Reports', icon: 'chart-bar', route: 'Reports' },
                    { name: 'Profile', icon: 'account', route: 'HRProfile' },
                ];
            case 'super_admin':
                return [
                    { name: 'Dashboard', icon: 'view-dashboard', route: 'AdminDashboard' },
                    { name: 'Stores', icon: 'store', route: 'StoreManagement' },
                    { name: 'Users', icon: 'account-group', route: 'UserManagement' },
                    { name: 'Settings', icon: 'cog', route: 'SystemSettings' },
                    { name: 'Analytics', icon: 'chart-line', route: 'Analytics' },
                ];
            case 'store_owner':
            default:
                return [
                    { name: 'Dashboard', icon: 'view-dashboard', route: 'Dashboard' },
                    { name: 'Employees', icon: 'account-group', route: 'Employees' },
                    { name: 'Approvals', icon: 'check-circle', route: 'Approvals' },
                    { name: 'Settings', icon: 'cog', route: 'Settings' },
                    { name: 'Profile', icon: 'account', route: 'Profile' },
                ];
        }
    };

    const menuItems = getMenuItems();

    if (!isLargeScreen) {
        return (
            <View style={[styles.mobileContainer, { backgroundColor: theme.colors.background }]}>
                {children}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Left Sidebar */}
            <View style={[styles.sidebar, { backgroundColor: theme.colors.sidebar, borderRightWidth: 1, borderRightColor: theme.colors.divider }]}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={[styles.logoIcon, { backgroundColor: theme.colors.primary }]}>
                        <MaterialCommunityIcons name="lightning-bolt" size={24} color={theme.colors.white} />
                    </View>
                    <Text style={[styles.logoText, { color: theme.colors.text }]}>Mawared</Text>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    {menuItems.map((item) => {
                        const isActive = activeRoute === item.route;
                        return (
                            <TouchableOpacity
                                key={item.name}
                                style={[
                                    styles.menuItem,
                                    isActive && { backgroundColor: theme.colors.sidebarActive },
                                ]}
                                onPress={() => navigation.navigate(item.route)}
                            >
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={22}
                                    color={isActive ? theme.colors.primary : theme.colors.sidebarIcon}
                                />
                                <Text
                                    style={[
                                        styles.menuText,
                                        { color: isActive ? theme.colors.text : theme.colors.sidebarText },
                                        isActive && styles.menuTextActive,
                                    ]}
                                >
                                    {item.name}
                                </Text>
                                {isActive && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Bottom Actions */}
                <View style={styles.sidebarFooter}>
                    <TouchableOpacity style={styles.footerAction} onPress={toggleTheme}>
                        <MaterialCommunityIcons
                            name={isDark ? "white-balance-sunny" : "moon-waning-crescent"}
                            size={20}
                            color={theme.colors.sidebarIcon}
                        />
                        <Text style={[styles.footerText, { color: theme.colors.sidebarText }]}>
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.colors.error + '10' }]} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color={theme.colors.error} />
                        <Text style={[styles.logoutText, { color: theme.colors.error }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content Area */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: 260,
        paddingVertical: 32,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 48,
        gap: 12,
    },
    logoIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    menuContainer: {
        flex: 1,
        gap: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 14,
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        right: 12,
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '500',
    },
    menuTextActive: {
        fontWeight: '600',
    },
    sidebarFooter: {
        gap: 12,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    footerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 12,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 12,
    },
    logoutText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    mobileContainer: {
        flex: 1,
    },
    mobileContent: {
        flex: 1,
    },
    bottomNav: {
        flexDirection: 'row',
        borderTopWidth: 1,
        height: 70,
        paddingBottom: 15,
        paddingTop: 10,
    },
    bottomNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomNavText: {
        fontSize: 11,
        marginTop: 4,
    },
    bottomNavTextActive: {
        fontWeight: '700',
    },
});
