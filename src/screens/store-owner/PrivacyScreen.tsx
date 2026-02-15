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

export default function PrivacyScreen({ navigation }: any) {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [shareData, setShareData] = useState(false);
    const [analytics, setAnalytics] = useState(true);
    const [locationTracking, setLocationTracking] = useState(false);
    const [twoFactor, setTwoFactor] = useState(false);

    return (
        <SidebarLayout navigation={navigation} activeRoute="Privacy">
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
                {isLargeScreen && <Text style={[styles.title, { color: theme.colors.text }]}>Privacy & Security</Text>}

                {/* Privacy Settings */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Privacy</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="share-variant" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Share Usage Data</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Help improve the app by sharing anonymous usage data
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={shareData}
                                onValueChange={setShareData}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={shareData ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="chart-line" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Analytics</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Allow analytics to improve your experience
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={analytics}
                                onValueChange={setAnalytics}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={analytics ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Location Tracking</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Track employee location for attendance
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={locationTracking}
                                onValueChange={setLocationTracking}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={locationTracking ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>
                    </Card.Content>
                </Card>

                {/* Security Settings */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Security</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="two-factor-authentication" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Two-Factor Authentication</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Add an extra layer of security to your account
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={twoFactor}
                                onValueChange={setTwoFactor}
                                trackColor={{ false: theme.colors.divider, true: theme.colors.primary }}
                                thumbColor={twoFactor ? theme.colors.primary : '#f4f3f4'}
                            />
                        </View>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="shield-lock" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Active Sessions</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Manage your active login sessions
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="history" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Login History</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        View your recent login activity
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* Data Management */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="download" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Download Your Data</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Get a copy of your data
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.error }]}>
                                        Delete Account
                                    </Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Permanently delete your account and data
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* Permissions */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Permissions</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="camera" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Camera Access</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Allowed</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="file-document" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Storage Access</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Allowed</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="bell" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Notifications</Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>Allowed</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </Card.Content>
                </Card>

                {/* Legal */}
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Legal</Text>

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Privacy Policy</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingInfo}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                                <View style={styles.settingText}>
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Terms of Service</Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
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
