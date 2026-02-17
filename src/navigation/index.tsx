import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    useWindowDimensions,
    TouchableOpacity,
    Platform,
    Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ForceChangePasswordScreen from '../screens/auth/ForceChangePasswordScreen';
import { supabase, signOut } from '../services/supabase';

import EmployeeHomeScreen from '../screens/employee/HomeScreen';
import AttendanceScreen from '../screens/employee/AttendanceScreen';
import LeaveScreen from '../screens/employee/LeaveScreen';
import RequestsScreen from '../screens/employee/RequestsScreen';
import PayrollScreen from '../screens/employee/PayrollScreen';
import ProfileScreen from '../screens/employee/ProfileScreen';

import StoreOwnerDashboardScreen from '../screens/store-owner/DashboardScreen';
import EmployeesScreen from '../screens/store-owner/EmployeesScreen';
import ApprovalsScreen from '../screens/store-owner/ApprovalsScreen';
import AddEmployeeScreen from '../screens/store-owner/AddEmployeeScreen';
import SettingsScreen from '../screens/store-owner/SettingsScreen';
import PrivacyScreen from '../screens/store-owner/PrivacyScreen';
import EditEmployeeScreen from '../screens/store-owner/EditEmployeeScreen';
import EmployeeDetailsScreen from '../screens/store-owner/EmployeeDetailsScreen';

import HRDashboardScreen from '../screens/hr-team/HRDashboardScreen';
import EmployeeDirectoryScreen from '../screens/hr-team/EmployeeDirectoryScreen';
import LeaveApprovalsScreen from '../screens/hr-team/LeaveApprovalsScreen';
import PayrollOverviewScreen from '../screens/hr-team/PayrollOverviewScreen';
import ReportsScreen from '../screens/hr-team/ReportsScreen';
import HRProfileScreen from '../screens/hr-team/HRProfileScreen';

import AdminDashboardScreen from '../screens/super-admin/AdminDashboardScreen';
import StoreManagementScreen from '../screens/super-admin/StoreManagementScreen';
import UserManagementScreen from '../screens/super-admin/UserManagementScreen';
import SystemSettingsScreen from '../screens/super-admin/SystemSettingsScreen';
import AnalyticsScreen from '../screens/super-admin/AnalyticsScreen';
import AddStoreOwnerScreen from '../screens/super-admin/AddStoreOwnerScreen';
import SubscriptionPlansScreen from '../screens/super-admin/SubscriptionPlansScreen';
import StoreDetailsScreen from '../screens/super-admin/StoreDetailsScreen';
import EditStoreScreen from '../screens/super-admin/EditStoreScreen';

import { AuthStackParamList, EmployeeTabParamList, StoreOwnerTabParamList } from '../types';
import { useTheme } from '../store/ThemeContext';
import withSidebarLayout from '../components/withSidebarLayout';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ChangePasswordStack = createNativeStackNavigator();
const EmployeeTab = createBottomTabNavigator<EmployeeTabParamList>();
const StoreOwnerTab = createBottomTabNavigator<StoreOwnerTabParamList>();
const StoreOwnerStack = createNativeStackNavigator();
const HRTab = createBottomTabNavigator();
const SuperAdminTab = createBottomTabNavigator();
const SuperAdminStack = createNativeStackNavigator();

export function AuthNavigator() {
    return (
        <AuthStack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
    );
}

export function ForceChangePasswordNavigator({ userId }: { userId: string }) {
    const { theme } = useTheme();

    return (
        <ChangePasswordStack.Navigator
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: '600' },
            }}
        >
            <ChangePasswordStack.Screen
                name="ForceChangePassword"
                component={ForceChangePasswordScreen}
                initialParams={{ userId }}
                options={{ title: 'Change Password', headerLeft: () => null }}
            />
        </ChangePasswordStack.Navigator>
    );
}

export function EmployeeNavigator() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    return (
        <EmployeeTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: isLargeScreen
                    ? { display: 'none' }
                    : {
                        backgroundColor: theme.colors.surface,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.divider,
                        paddingBottom: 5,
                        paddingTop: 5,
                        height: 60,
                    },
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary || '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerShown: !isLargeScreen,
            }}
        >
            <EmployeeTab.Screen
                name="Home"
                component={withSidebarLayout(EmployeeHomeScreen, 'employee', 'Home')}
                options={{
                    title: t('common.appName'),
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" size={size} color={color} />
                    ),
                }}
            />
            <EmployeeTab.Screen
                name="Attendance"
                component={withSidebarLayout(AttendanceScreen, 'employee', 'Attendance')}
                options={{
                    title: t('attendance.title'),
                    tabBarLabel: 'Attendance',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="clock-outline" size={size} color={color} />
                    ),
                }}
            />
            <EmployeeTab.Screen
                name="Leave"
                component={withSidebarLayout(LeaveScreen, 'employee', 'Leave')}
                options={{
                    title: t('leave.title'),
                    tabBarLabel: 'Leave',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="calendar" size={size} color={color} />
                    ),
                }}
            />
            <EmployeeTab.Screen
                name="Requests"
                component={withSidebarLayout(RequestsScreen, 'employee', 'Requests')}
                options={{
                    title: t('requests.title'),
                    tabBarLabel: 'Requests',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="file-document" size={size} color={color} />
                    ),
                }}
            />
            <EmployeeTab.Screen
                name="Payroll"
                component={withSidebarLayout(PayrollScreen, 'employee', 'Payroll')}
                options={{
                    title: t('payroll.title'),
                    tabBarLabel: 'Payroll',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cash" size={size} color={color} />
                    ),
                }}
            />
            <EmployeeTab.Screen
                name="Profile"
                component={withSidebarLayout(ProfileScreen, 'employee', 'Profile')}
                options={{
                    title: t('profile.title'),
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
        </EmployeeTab.Navigator>
    );
}

function StoreOwnerTabs() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    return (
        <StoreOwnerTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: isLargeScreen
                    ? { display: 'none' }
                    : {
                        backgroundColor: theme.colors.surface,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.divider,
                        paddingBottom: 5,
                        paddingTop: 5,
                        height: 60,
                    },
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary || '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerShown: !isLargeScreen,
            }}
        >
            <StoreOwnerTab.Screen
                name="Dashboard"
                component={withSidebarLayout(StoreOwnerDashboardScreen, 'store_owner', 'Dashboard')}
                options={{
                    title: 'Dashboard',
                    tabBarLabel: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <StoreOwnerTab.Screen
                name="Employees"
                component={withSidebarLayout(EmployeesScreen, 'store_owner', 'Employees')}
                options={{
                    title: 'Employees',
                    tabBarLabel: 'Employees',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <StoreOwnerTab.Screen
                name="Approvals"
                component={withSidebarLayout(ApprovalsScreen, 'store_owner', 'Approvals')}
                options={{
                    title: 'Approvals',
                    tabBarLabel: 'Approvals',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="check-circle" size={size} color={color} />
                    ),
                }}
            />
            <StoreOwnerTab.Screen
                name="Settings"
                component={withSidebarLayout(SettingsScreen, 'store_owner', 'Settings')}
                options={{
                    title: 'Settings',
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" size={size} color={color} />
                    ),
                }}
            />
            <StoreOwnerTab.Screen
                name="Profile"
                component={withSidebarLayout(ProfileScreen, 'store_owner', 'Profile')}
                options={{
                    title: 'Profile',
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
        </StoreOwnerTab.Navigator>
    );
}

export function StoreOwnerNavigator() {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    return (
        <StoreOwnerStack.Navigator
            screenOptions={{
                headerShown: !isLargeScreen,
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary || '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
            }}
        >
            <StoreOwnerStack.Screen
                name="MainTabs"
                component={StoreOwnerTabs}
                options={{ headerShown: false }}
            />
            <StoreOwnerStack.Screen
                name="Privacy"
                component={withSidebarLayout(PrivacyScreen, 'store_owner', 'Privacy')}
                options={{ title: 'Privacy & Security' }}
            />
            <StoreOwnerStack.Screen
                name="AddEmployee"
                component={withSidebarLayout(AddEmployeeScreen, 'store_owner', 'Employees')}
                options={{ title: 'Add Employee' }}
            />
            <StoreOwnerStack.Screen
                name="EditEmployee"
                component={withSidebarLayout(EditEmployeeScreen, 'store_owner', 'Employees')}
                options={{ title: 'Edit Employee' }}
            />
            <StoreOwnerStack.Screen
                name="EmployeeDetails"
                component={withSidebarLayout(EmployeeDetailsScreen, 'store_owner', 'Employees')}
                options={{ title: 'Employee Details' }}
            />
        </StoreOwnerStack.Navigator>
    );
}

export function HRNavigator() {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    return (
        <HRTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: isLargeScreen
                    ? { display: 'none' }
                    : {
                        backgroundColor: theme.colors.surface,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.divider,
                        paddingBottom: 5,
                        paddingTop: 5,
                        height: 60,
                    },
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary || '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerShown: !isLargeScreen,
            }}
        >
            <HRTab.Screen
                name="HRDashboard"
                component={withSidebarLayout(HRDashboardScreen, 'hr_team', 'HRDashboard')}
                options={{
                    title: 'HR Dashboard',
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <HRTab.Screen
                name="EmployeeDirectory"
                component={withSidebarLayout(EmployeeDirectoryScreen, 'hr_team', 'EmployeeDirectory')}
                options={{
                    title: 'Employee Directory',
                    tabBarLabel: 'Employees',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <HRTab.Screen
                name="LeaveApprovals"
                component={withSidebarLayout(LeaveApprovalsScreen, 'hr_team', 'LeaveApprovals')}
                options={{
                    title: 'Leave Approvals',
                    tabBarLabel: 'Leaves',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
                    ),
                }}
            />
            <HRTab.Screen
                name="PayrollOverview"
                component={withSidebarLayout(PayrollOverviewScreen, 'hr_team', 'PayrollOverview')}
                options={{
                    title: 'Payroll Overview',
                    tabBarLabel: 'Payroll',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cash" size={size} color={color} />
                    ),
                }}
            />
            <HRTab.Screen
                name="Reports"
                component={withSidebarLayout(ReportsScreen, 'hr_team', 'Reports')}
                options={{
                    title: 'Reports',
                    tabBarLabel: 'Reports',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
                    ),
                }}
            />
            <HRTab.Screen
                name="HRProfile"
                component={withSidebarLayout(HRProfileScreen, 'hr_team', 'HRProfile')}
                options={{
                    title: 'Profile',
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
        </HRTab.Navigator>
    );
}

function SuperAdminTabs() {
    const { theme, isDark, setMode } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    return (
        <SuperAdminTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: isLargeScreen
                    ? { display: 'none' }
                    : {
                        backgroundColor: theme.colors.surface,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.divider,
                        paddingBottom: 5,
                        paddingTop: 5,
                        height: 60,
                    },
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: theme.colors.onPrimary || '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerShown: !isLargeScreen,
                headerRight: () => !isLargeScreen && (
                    <View style={{ flexDirection: 'row', marginRight: 10 }}>
                        <TouchableOpacity
                            onPress={() => setMode(isDark ? 'light' : 'dark')}
                            style={{ padding: 8 }}
                        >
                            <MaterialCommunityIcons
                                name={isDark ? "white-balance-sunny" : "moon-waning-crescent"}
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={async () => {
                                if (Platform.OS === 'web') {
                                    if (window.confirm('Are you sure you want to logout?')) {
                                        try { await signOut(); } catch (e) { console.error('Logout failed:', e); }
                                    }
                                } else {
                                    Alert.alert('Logout', 'Are you sure you want to logout?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Logout', style: 'destructive', onPress: async () => { try { await signOut(); } catch (e) { console.error('Logout failed:', e); } } }
                                    ]);
                                }
                            }}
                            style={{ padding: 8 }}
                        >
                            <MaterialCommunityIcons name="logout" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                )
            }}
        >
            <SuperAdminTab.Screen
                name="AdminDashboard"
                component={withSidebarLayout(AdminDashboardScreen, 'super_admin', 'AdminDashboard')}
                options={{
                    title: 'Admin Dashboard',
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="StoreManagement"
                component={withSidebarLayout(StoreManagementScreen, 'super_admin', 'StoreManagement')}
                options={{
                    title: 'Stores',
                    tabBarLabel: 'Stores',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="store" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="UserManagement"
                component={withSidebarLayout(UserManagementScreen, 'super_admin', 'UserManagement')}
                options={{
                    title: 'Users',
                    tabBarLabel: 'Users',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="SystemSettings"
                component={withSidebarLayout(SystemSettingsScreen, 'super_admin', 'SystemSettings')}
                options={{
                    title: 'Settings',
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="Analytics"
                component={withSidebarLayout(AnalyticsScreen, 'super_admin', 'Analytics')}
                options={{
                    title: 'Analytics',
                    tabBarLabel: 'Analytics',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-line" size={size} color={color} />
                    ),
                }}
            />
        </SuperAdminTab.Navigator>
    );
}

export function SuperAdminNavigator() {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    return (
        <SuperAdminStack.Navigator
            screenOptions={{
                headerShown: !isLargeScreen,
                headerStyle: {
                    backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                    fontWeight: '600',
                },
            }}
        >
            <SuperAdminStack.Screen
                name="AdminTabs"
                component={SuperAdminTabs}
                options={{ headerShown: false }}
            />
            <SuperAdminStack.Screen
                name="AddStoreOwner"
                component={withSidebarLayout(AddStoreOwnerScreen, 'super_admin', 'StoreManagement')}
                options={{ title: 'Add Store Owner' }}
            />
            <SuperAdminStack.Screen
                name="Subscriptions"
                component={withSidebarLayout(SubscriptionPlansScreen, 'super_admin', 'SystemSettings')}
                options={{ title: 'Subscription Plans' }}
            />
            <SuperAdminStack.Screen
                name="StoreDetails"
                component={withSidebarLayout(StoreDetailsScreen, 'super_admin', 'StoreManagement')}
                options={{ title: 'Store Details' }}
            />
            <SuperAdminStack.Screen
                name="EditStore"
                component={withSidebarLayout(EditStoreScreen, 'super_admin', 'StoreManagement')}
                options={{ title: 'Edit Store' }}
            />
        </SuperAdminStack.Navigator>
    );
}
