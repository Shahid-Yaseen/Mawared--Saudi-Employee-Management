import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Switch,
    TouchableOpacity,
} from 'react-native';
import { Card, Button, TextInput, Chip } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

const WEEKEND_OPTIONS = [
    { label: 'Fri & Sat', value: 'fri_sat' },
    { label: 'Sat & Sun', value: 'sat_sun' },
];

const ACCRUAL_OPTIONS = [
    { label: 'Monthly', value: 'monthly' },
    { label: 'Annual', value: 'annual' },
];

const LANGUAGE_OPTIONS = [
    { label: 'English', value: 'en' },
    { label: 'العربية', value: 'ar' },
];

interface SystemSettings {
    defaultRadius: string;
    minRadius: string;
    maxRadius: string;
    annualLeaveDefault: string;
    sickLeaveDefault: string;
    leaveAccrualMethod: string;
    payrollCycleDay: string;
    overtimeMultiplier: string;
    weekendDays: string;
    maintenanceMode: boolean;
    maxStoresPerOwner: string;
    defaultLanguage: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
    defaultRadius: '100',
    minRadius: '50',
    maxRadius: '500',
    annualLeaveDefault: '21',
    sickLeaveDefault: '15',
    leaveAccrualMethod: 'monthly',
    payrollCycleDay: '1',
    overtimeMultiplier: '1.5',
    weekendDays: 'fri_sat',
    maintenanceMode: false,
    maxStoresPerOwner: '5',
    defaultLanguage: 'en',
};

export default function SystemSettingsScreen() {
    const { theme } = useTheme();
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [originalSettings, setOriginalSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
        setHasChanges(changed);
    }, [settings, originalSettings]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getSystemSettings();
            if (data && data.settings) {
                const loaded: SystemSettings = {
                    defaultRadius: String(data.settings.defaultRadius ?? DEFAULT_SETTINGS.defaultRadius),
                    minRadius: String(data.settings.minRadius ?? DEFAULT_SETTINGS.minRadius),
                    maxRadius: String(data.settings.maxRadius ?? DEFAULT_SETTINGS.maxRadius),
                    annualLeaveDefault: String(data.settings.annualLeaveDefault ?? DEFAULT_SETTINGS.annualLeaveDefault),
                    sickLeaveDefault: String(data.settings.sickLeaveDefault ?? DEFAULT_SETTINGS.sickLeaveDefault),
                    leaveAccrualMethod: data.settings.leaveAccrualMethod ?? DEFAULT_SETTINGS.leaveAccrualMethod,
                    payrollCycleDay: String(data.settings.payrollCycleDay ?? DEFAULT_SETTINGS.payrollCycleDay),
                    overtimeMultiplier: String(data.settings.overtimeMultiplier ?? DEFAULT_SETTINGS.overtimeMultiplier),
                    weekendDays: data.settings.weekendDays ?? DEFAULT_SETTINGS.weekendDays,
                    maintenanceMode: data.settings.maintenanceMode ?? DEFAULT_SETTINGS.maintenanceMode,
                    maxStoresPerOwner: String(data.settings.maxStoresPerOwner ?? DEFAULT_SETTINGS.maxStoresPerOwner),
                    defaultLanguage: data.settings.defaultLanguage ?? DEFAULT_SETTINGS.defaultLanguage,
                };
                setSettings(loaded);
                setOriginalSettings(loaded);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                defaultRadius: Number(settings.defaultRadius),
                minRadius: Number(settings.minRadius),
                maxRadius: Number(settings.maxRadius),
                annualLeaveDefault: Number(settings.annualLeaveDefault),
                sickLeaveDefault: Number(settings.sickLeaveDefault),
                leaveAccrualMethod: settings.leaveAccrualMethod,
                payrollCycleDay: Number(settings.payrollCycleDay),
                overtimeMultiplier: Number(settings.overtimeMultiplier),
                weekendDays: settings.weekendDays,
                maintenanceMode: settings.maintenanceMode,
                maxStoresPerOwner: Number(settings.maxStoresPerOwner),
                defaultLanguage: settings.defaultLanguage,
            };
            await adminApi.saveSystemSettings(payload);
            setOriginalSettings({ ...settings });
            setHasChanges(false);
            Alert.alert('Success', 'System settings have been saved successfully.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (key: keyof SystemSettings, value: string | boolean) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const renderNumberInput = (
        label: string,
        settingKey: keyof SystemSettings,
        icon: string,
        iconFamily: 'ionicons' | 'material' = 'ionicons',
        suffix?: string
    ) => (
        <View style={styles.inputRow}>
            <View style={styles.inputLabelRow}>
                {iconFamily === 'ionicons' ? (
                    <Ionicons name={icon as any} size={18} color={theme.colors.primary} />
                ) : (
                    <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.primary} />
                )}
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{label}</Text>
            </View>
            <View style={styles.inputWrapper}>
                <TextInput
                    mode="outlined"
                    value={String(settings[settingKey])}
                    onChangeText={(val) => updateSetting(settingKey, val.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    style={[styles.numberInput, { backgroundColor: theme.colors.surface }]}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    dense
                />
                {suffix && <Text style={[styles.inputSuffix, { color: theme.colors.textSecondary }]}>{suffix}</Text>}
            </View>
        </View>
    );

    const renderChipSelector = (
        label: string,
        settingKey: keyof SystemSettings,
        options: { label: string; value: string }[],
        icon: string,
        iconFamily: 'ionicons' | 'material' = 'ionicons'
    ) => (
        <View style={styles.inputRow}>
            <View style={styles.inputLabelRow}>
                {iconFamily === 'ionicons' ? (
                    <Ionicons name={icon as any} size={18} color={theme.colors.primary} />
                ) : (
                    <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.primary} />
                )}
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{label}</Text>
            </View>
            <View style={styles.chipRow}>
                {options.map((opt) => {
                    const isSelected = settings[settingKey] === opt.value;
                    return (
                        <Chip
                            key={opt.value}
                            mode={isSelected ? 'flat' : 'outlined'}
                            selected={isSelected}
                            onPress={() => updateSetting(settingKey, opt.value)}
                            style={[
                                styles.optionChip,
                                isSelected && { backgroundColor: theme.colors.primary + '20' },
                            ]}
                            textStyle={[
                                styles.optionChipText,
                                isSelected && { color: theme.colors.primary },
                                !isSelected && { color: theme.colors.textSecondary },
                            ]}
                            selectedColor={theme.colors.primary}
                        >
                            {opt.label}
                        </Chip>
                    );
                })}
            </View>
        </View>
    );

    const renderToggle = (
        label: string,
        description: string,
        settingKey: keyof SystemSettings,
        icon: string,
        iconFamily: 'ionicons' | 'material' = 'ionicons'
    ) => (
        <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
                <View style={styles.inputLabelRow}>
                    {iconFamily === 'ionicons' ? (
                        <Ionicons name={icon as any} size={18} color={theme.colors.primary} />
                    ) : (
                        <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.primary} />
                    )}
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>{label}</Text>
                </View>
                <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
            </View>
            <Switch
                value={settings[settingKey] as boolean}
                onValueChange={(val) => updateSetting(settingKey, val)}
                trackColor={{ false: theme.colors.outline, true: theme.colors.primary + '60' }}
                thumbColor={settings[settingKey] ? theme.colors.primary : '#f4f3f4'}
            />
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading settings...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="map-marker-radius" size={22} color={theme.colors.primary} />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Geofence Settings</Text>
                        </View>
                        {renderNumberInput('Default Radius', 'defaultRadius', 'locate-outline', 'ionicons', 'meters')}
                        {renderNumberInput('Min Radius', 'minRadius', 'remove-circle-outline', 'ionicons', 'meters')}
                        {renderNumberInput('Max Radius', 'maxRadius', 'add-circle-outline', 'ionicons', 'meters')}
                    </Card.Content>
                </Card>

                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="calendar-check" size={22} color="#10B981" />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Leave Settings</Text>
                        </View>
                        {renderNumberInput('Annual Leave Default', 'annualLeaveDefault', 'calendar-outline', 'ionicons', 'days')}
                        {renderNumberInput('Sick Leave Default', 'sickLeaveDefault', 'medkit-outline', 'ionicons', 'days')}
                        {renderChipSelector('Accrual Method', 'leaveAccrualMethod', ACCRUAL_OPTIONS, 'sync-outline', 'ionicons')}
                    </Card.Content>
                </Card>

                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cash-multiple" size={22} color="#F59E0B" />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payroll Settings</Text>
                        </View>
                        {renderNumberInput('Payroll Cycle Day', 'payrollCycleDay', 'calendar-number-outline', 'ionicons', 'of month')}
                        {renderNumberInput('Overtime Multiplier', 'overtimeMultiplier', 'timer-outline', 'ionicons', 'x')}
                        {renderChipSelector('Weekend Days', 'weekendDays', WEEKEND_OPTIONS, 'calendar-blank-multiple', 'material')}
                    </Card.Content>
                </Card>

                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="cog" size={22} color="#3B82F6" />
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Platform Settings</Text>
                        </View>
                        {renderToggle('Maintenance Mode', 'Put the system in maintenance mode', 'maintenanceMode', 'construct-outline', 'ionicons')}
                        {renderNumberInput('Max Stores Per Owner', 'maxStoresPerOwner', 'storefront-outline', 'ionicons')}
                        {renderChipSelector('Default Language', 'defaultLanguage', LANGUAGE_OPTIONS, 'language-outline', 'ionicons')}
                    </Card.Content>
                </Card>

                <View style={styles.bottomSpacing} />
            </ScrollView>

            <View style={[styles.saveContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.divider }]}>
                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={saving}
                    disabled={saving || !hasChanges}
                    style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
                    labelStyle={styles.saveButtonLabel}
                    buttonColor={theme.colors.primary}
                    textColor="white"
                    icon={({ size, color }) => (
                        <MaterialCommunityIcons name="content-save" size={size} color={color} />
                    )}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    scrollContent: {
        padding: 12,
    },
    card: {
        marginBottom: 12,
        elevation: 2,
        borderRadius: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    inputRow: {
        marginBottom: 16,
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    numberInput: {
        flex: 1,
        height: 42,
    },
    inputSuffix: {
        fontSize: 13,
        minWidth: 50,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        borderRadius: 20,
    },
    optionChipText: {
        fontSize: 13,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    toggleInfo: {
        flex: 1,
        marginRight: 12,
    },
    toggleDescription: {
        fontSize: 12,
        marginTop: 2,
        marginLeft: 26,
    },
    saveContainer: {
        padding: 12,
        paddingBottom: 24,
        borderTopWidth: 1,
        elevation: 8,
    },
    saveButton: {
        borderRadius: 10,
        paddingVertical: 4,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    bottomSpacing: {
        height: 20,
    },
});
