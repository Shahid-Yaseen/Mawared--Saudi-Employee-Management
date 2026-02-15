import React from 'react';
import { useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Employee Screens
import EmployeeHomeScreen from '../screens/employee/HomeScreen';
import AttendanceScreen from '../screens/employee/AttendanceScreen';
import LeaveScreen from '../screens/employee/LeaveScreen';
import RequestsScreen from '../screens/employee/RequestsScreen';
import PayrollScreen from '../screens/employee/PayrollScreen';
import ProfileScreen from '../screens/employee/ProfileScreen';

// Store Owner Screens
import StoreOwnerDashboardScreen from '../screens/store-owner/DashboardScreen';
import EmployeesScreen from '../screens/store-owner/EmployeesScreen';
import ApprovalsScreen from '../screens/store-owner/ApprovalsScreen';
import AddEmployeeScreen from '../screens/store-owner/AddEmployeeScreen';
import SettingsScreen from '../screens/store-owner/SettingsScreen';
import PrivacyScreen from '../screens/store-owner/PrivacyScreen';

// HR Team Screens
import HRDashboardScreen from '../screens/hr-team/HRDashboardScreen';
import EmployeeDirectoryScreen from '../screens/hr-team/EmployeeDirectoryScreen';
import LeaveApprovalsScreen from '../screens/hr-team/LeaveApprovalsScreen';
import PayrollOverviewScreen from '../screens/hr-team/PayrollOverviewScreen';
import ReportsScreen from '../screens/hr-team/ReportsScreen';
import HRProfileScreen from '../screens/hr-team/HRProfileScreen';

// Super Admin Screens
import AdminDashboardScreen from '../screens/super-admin/AdminDashboardScreen';
import StoreManagementScreen from '../screens/super-admin/StoreManagementScreen';
import UserManagementScreen from '../screens/super-admin/UserManagementScreen';
import SystemSettingsScreen from '../screens/super-admin/SystemSettingsScreen';
import AnalyticsScreen from '../screens/super-admin/AnalyticsScreen';

import { AuthStackParamList, EmployeeTabParamList, StoreOwnerTabParamList } from '../types';
import { useTheme } from '../store/ThemeContext';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const EmployeeTab = createBottomTabNavigator<EmployeeTabParamList>();
const StoreOwnerTab = createBottomTabNavigator<StoreOwnerTabParamList>();
const StoreOwnerStack = createNativeStackNavigator();
const HRTab = createBottomTabNavigator();
const SuperAdminTab = createBottomTabNavigator();

// Auth Navigator
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

// Employee Tab Navigator
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
                    ? { display: 'none' } // Hide tab bar on large screens
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
                headerShown: !isLargeScreen, // Hide header on large screens (sidebar has its own header)
            }}
        >
            <EmployeeTab.Screen
                name="Home"
                component={EmployeeHomeScreen}
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
                component={AttendanceScreen}
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
                component={LeaveScreen}
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
                component={RequestsScreen}
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
                component={PayrollScreen}
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
                component={ProfileScreen}
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

// Store Owner Tab Navigator (For Mobile)
function StoreOwnerTabs() {
    const { t } = useTranslation();
    const { theme } = useTheme();

    return (
        <StoreOwnerTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: {
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
            }}
        >
            <StoreOwnerTab.Screen
                name="Dashboard"
                component={StoreOwnerDashboardScreen}
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
                component={EmployeesScreen}
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
                component={ApprovalsScreen}
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
                component={SettingsScreen}
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
                component={ProfileScreen}
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

// Responsive Store Owner Navigator
export function StoreOwnerNavigator() {
    const { t } = useTranslation();
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
            }}
        >
            {!isLargeScreen ? (
                // Mobile Layout: Tabs as root
                <>
                    <StoreOwnerStack.Screen
                        name="MainTabs"
                        component={StoreOwnerTabs}
                        options={{ headerShown: false }}
                    />
                    <StoreOwnerStack.Screen name="Settings" component={SettingsScreen} />
                    <StoreOwnerStack.Screen name="Privacy" component={PrivacyScreen} />
                    <StoreOwnerStack.Screen name="AddEmployee" component={AddEmployeeScreen} />
                </>
            ) : (
                // Desktop Layout: Sidebar-aware individual screens
                <>
                    <StoreOwnerStack.Screen
                        name="Dashboard"
                        component={StoreOwnerDashboardScreen}
                    />
                    <StoreOwnerStack.Screen
                        name="Employees"
                        component={EmployeesScreen}
                    />
                    <StoreOwnerStack.Screen
                        name="Approvals"
                        component={ApprovalsScreen}
                    />
                    <StoreOwnerStack.Screen
                        name="Profile"
                        component={ProfileScreen}
                    />
                    <StoreOwnerStack.Screen
                        name="Settings"
                        component={SettingsScreen}
                    />
                    <StoreOwnerStack.Screen
                        name="Privacy"
                        component={PrivacyScreen}
                    />
                    <StoreOwnerStack.Screen
                        name="AddEmployee"
                        component={AddEmployeeScreen}
                        options={{
                            headerShown: true,
                            title: 'Add Employee',
                        }}
                    />
                </>
            )}
        </StoreOwnerStack.Navigator>
    );
}

// HR Team Navigator
export function HRNavigator() {
    const { theme } = useTheme();

    return (
        <HRTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: {
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
            }}
        >
            <HRTab.Screen
                name="HRDashboard"
                component={HRDashboardScreen}
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
                component={EmployeeDirectoryScreen}
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
                component={LeaveApprovalsScreen}
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
                component={PayrollOverviewScreen}
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
                component={ReportsScreen}
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
                component={HRProfileScreen}
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

// Super Admin Navigator
export function SuperAdminNavigator() {
    const { theme } = useTheme();

    return (
        <SuperAdminTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarStyle: {
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
            }}
        >
            <SuperAdminTab.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
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
                component={StoreManagementScreen}
                options={{
                    title: 'Store Management',
                    tabBarLabel: 'Stores',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="store" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="UserManagement"
                component={UserManagementScreen}
                options={{
                    title: 'User Management',
                    tabBarLabel: 'Users',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="SystemSettings"
                component={SystemSettingsScreen}
                options={{
                    title: 'System Settings',
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" size={size} color={color} />
                    ),
                }}
            />
            <SuperAdminTab.Screen
                name="Analytics"
                component={AnalyticsScreen}
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
