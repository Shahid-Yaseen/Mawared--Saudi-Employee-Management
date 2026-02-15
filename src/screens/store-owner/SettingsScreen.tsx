import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import SidebarLayout from '../../components/SidebarLayout';

export default function SettingsScreen({ navigation }: any) {
    const { theme, isDark, setMode } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [notifications, setNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [autoApprove, setAutoApprove] = useState(false);

    return (
        <SidebarLayout navigation={navigation} activeRoute="Settings">
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
                {isLargeScreen && <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>}

                {/* General Settings */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>General</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="bell" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Push Notifications</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Receive notifications for important updates
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={notifications ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="email" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Email Alerts</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Get email notifications for leave requests
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={emailAlerts}
                                onValueChange={setEmailAlerts}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={emailAlerts ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Dark Mode</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Switch to dark theme
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={(value) => setMode(value ? 'dark' : 'light')}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={isDark ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('Privacy')}
                        >
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="shield-lock" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Privacy & Security</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Manage your data and security settings
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* Approval Settings */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Approvals</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Auto-approve Leave</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Automatically approve leave requests under 2 days
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={autoApprove}
                                onValueChange={setAutoApprove}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={autoApprove ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* Account Settings */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="account-edit" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Edit Profile</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Update your personal information
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="lock-reset" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Change Password</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Update your account password
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="store-edit" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Store Information</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Update store details and settings
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* Language & Region */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Language & Region</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="translate" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Language</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>English</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Region</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Saudi Arabia</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* About */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="information" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Version</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>1.0.0</Text>
                                </View>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            </ScrollView>
        </SidebarLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
    },
    title: {
        ...Typography.h3,
        marginBottom: Spacing.lg,
        fontWeight: '700',
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    sectionTitle: {
        ...Typography.h5,
        marginBottom: Spacing.md,
        fontWeight: '600',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: Spacing.md,
    },
    settingText: {
        flex: 1,
    },
    settingLabel: {
        ...Typography.body,
        fontWeight: '500',
        marginBottom: 4,
    },
    settingDescription: {
        ...Typography.caption,
    },
    divider: {
        marginVertical: Spacing.sm,
    },
});
