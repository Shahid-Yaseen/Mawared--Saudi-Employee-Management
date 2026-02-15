import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { Card, Button, Avatar, Switch, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, signOut } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import SidebarLayout from '../../components/SidebarLayout';

export default function ProfileScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { theme, isDark, setMode } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [employee, setEmployee] = useState<any>(null);
    const [isArabic, setIsArabic] = useState(i18n.language === 'ar');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            setProfile(profileData);

            // Role fallback based on email
            if (!profileData?.role && user.email) {
                if (user.email.includes('owner@') || user.email.includes('admin@')) {
                    setProfile((prev: any) => ({ ...prev, role: 'store_owner' }));
                }
            }

            const { data: empData } = await supabase
                .from('employees')
                .select('*')
                .eq('profile_id', user.id)
                .single();

            setEmployee(empData);
        } catch (error) {
            console.error('Error loading profile:', error);
            // Even on error, try to set role based on email for UI visibility
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email && (user.email.includes('owner@') || user.email.includes('admin@'))) {
                setProfile((prev: any) => ({ ...prev, role: 'store_owner' }));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageToggle = () => {
        const newLang = isArabic ? 'en' : 'ar';
        i18n.changeLanguage(newLang);
        setIsArabic(!isArabic);
    };

    const handleLogout = () => {
        Alert.alert(
            t('common.logout'),
            'Are you sure you want to logout?',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ]
        );
    };

    const content = (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
            {/* Profile Header */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content style={styles.profileHeader}>
                    <Avatar.Text
                        size={80}
                        label={profile?.full_name?.substring(0, 2).toUpperCase() || 'EM'}
                        style={{ backgroundColor: theme.colors.primary }}
                        labelStyle={{ color: '#FFFFFF' }}
                    />
                    <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.full_name}</Text>
                    <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{profile?.email}</Text>
                </Card.Content>
            </Card>

            {/* Personal Information */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('profile.personalInfo')}</Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.fullName')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{profile?.full_name}</Text>
                    </View>
                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.email')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{profile?.email}</Text>
                    </View>
                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.phone')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{profile?.phone || 'N/A'}</Text>
                    </View>
                </Card.Content>
            </Card>

            {/* Employment Information */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('profile.employmentInfo')}</Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.employeeNumber')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{employee?.employee_number}</Text>
                    </View>
                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.department')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{employee?.department}</Text>
                    </View>
                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.position')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{employee?.position}</Text>
                    </View>
                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{t('profile.hireDate')}</Text>
                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                            {employee?.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>
                </Card.Content>
            </Card>

            {/* Settings */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('profile.settings')}</Text>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <View style={styles.settingRow}>
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('profile.language')}</Text>
                            <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>
                                {isArabic ? t('profile.arabic') : t('profile.english')}
                            </Text>
                        </View>
                        <Switch
                            value={isArabic}
                            onValueChange={handleLanguageToggle}
                            color={theme.colors.primary}
                        />
                    </View>

                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                    <View style={styles.settingRow}>
                        <View style={styles.settingLeft}>
                            <MaterialCommunityIcons
                                name={isDark ? "white-balance-sunny" : "moon-waning-crescent"}
                                size={22}
                                color={theme.colors.primary}
                            />
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                            </Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={(val) => setMode(val ? 'dark' : 'light')}
                            color={theme.colors.primary}
                        />
                    </View>

                    <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
                    <TouchableOpacity style={styles.settingRow} onPress={() => { }}>
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('profile.changePassword')}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </Card.Content>
            </Card>

            {/* Store Owner Features */}
            {profile?.role === 'store_owner' && (
                <>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Management</Text>
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <TouchableOpacity
                                style={styles.settingRow}
                                onPress={() => navigation.navigate('Settings')}
                            >
                                <View style={styles.settingLeft}>
                                    <MaterialCommunityIcons name="cog-outline" size={22} color={theme.colors.primary} />
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Store Settings</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                            <TouchableOpacity
                                style={styles.settingRow}
                                onPress={() => navigation.navigate('Privacy')}
                            >
                                <View style={styles.settingLeft}>
                                    <MaterialCommunityIcons name="shield-check-outline" size={22} color={theme.colors.primary} />
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Privacy & Security</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            <Divider style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                            <TouchableOpacity
                                style={styles.settingRow}
                                onPress={() => navigation.navigate('Employees')}
                            >
                                <View style={styles.settingLeft}>
                                    <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.colors.primary} />
                                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Manage Employees</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </Card.Content>
                    </Card>
                </>
            )}

            {/* Logout Button */}
            <Button
                mode="outlined"
                onPress={handleLogout}
                style={[styles.logoutButton, { borderColor: theme.colors.error }]}
                textColor={theme.colors.error}
                icon="logout"
            >
                {t('common.logout')}
            </Button>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Mawared v1.0.0</Text>
                <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>© 2026 All rights reserved</Text>
            </View>
        </ScrollView>
    );

    return isLargeScreen ? (
        <SidebarLayout navigation={navigation} activeRoute="Profile">
            {content}
        </SidebarLayout>
    ) : (
        content
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    name: {
        ...Typography.h3,
        marginTop: Spacing.md,
    },
    email: {
        ...Typography.body,
        marginTop: Spacing.xs,
    },
    sectionTitle: {
        ...Typography.h5,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    infoLabel: {
        ...Typography.body,
    },
    infoValue: {
        ...Typography.body,
        fontWeight: '600',
    },
    divider: {
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    settingLabel: {
        ...Typography.body,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    settingValue: {
        ...Typography.caption,
    },
    arrow: {
        ...Typography.h3,
    },
    logoutButton: {
        borderRadius: BorderRadius.md,
        marginVertical: Spacing.lg,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    footerText: {
        ...Typography.caption,
    },
});
