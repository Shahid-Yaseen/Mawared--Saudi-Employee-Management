import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { calculateDistance, validateGeofence, formatDistance } from '../../utils/helpers';
import { Employee, Store, AttendanceRecord } from '../../types';


export default function AttendanceScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [store, setStore] = useState<Store | null>(null);
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [distance, setDistance] = useState<number>(0);
    const [isInRange, setIsInRange] = useState(false);

    useEffect(() => {
        loadData();
        requestLocationPermission();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get employee record
            const { data: empData } = await supabase
                .from('employees')
                .select('*')
                .eq('profile_id', user.id)
                .single();

            if (empData) {
                setEmployee(empData);

                // Get store details
                const { data: storeData } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', empData.store_id)
                    .single();

                setStore(storeData);

                // Get today's attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: attendanceData } = await supabase
                    .from('attendance_records')
                    .select('*')
                    .eq('employee_id', empData.id)
                    .gte('clock_in_time', `${today}T00:00:00`)
                    .lt('clock_in_time', `${today}T23:59:59`)
                    .maybeSingle();

                setTodayAttendance(attendanceData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Location permission is required for attendance tracking'
                );
                return;
            }

            // Start watching location
            watchLocation();
        } catch (error) {
            console.error('Error requesting location permission:', error);
        }
    };

    const watchLocation = async () => {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setCurrentLocation(location);

            if (store) {
                // Parse store location from PostGIS format
                // Assuming store.location is stored as {latitude, longitude}
                const workLocation = store.location as any;

                const dist = calculateDistance(
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    {
                        latitude: workLocation.latitude || 0,
                        longitude: workLocation.longitude || 0,
                    }
                );

                setDistance(dist);

                const validation = validateGeofence(
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    {
                        latitude: workLocation.latitude || 0,
                        longitude: workLocation.longitude || 0,
                    },
                    store.geofence_radius
                );

                setIsInRange(validation.isValid);
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const handleClockIn = async () => {
        if (!employee || !store || !currentLocation) return;

        if (!isInRange) {
            Alert.alert(
                t('common.error'),
                t('attendance.geofenceError')
            );
            return;
        }

        setActionLoading(true);

        try {
            const { data, error } = await supabase
                .from('attendance_records')
                .insert({
                    employee_id: employee.id,
                    store_id: store.id,
                    clock_in_time: new Date().toISOString(),
                    clock_in_location: `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`,
                    clock_in_device_id: employee.device_id || 'unknown',
                    status: 'on_time', // This should be calculated based on expected time
                })
                .select()
                .single();

            if (error) throw error;

            setTodayAttendance(data);
            Alert.alert(t('common.success'), t('attendance.clockInSuccess'));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!todayAttendance || !currentLocation) return;

        if (!isInRange) {
            Alert.alert(
                t('common.error'),
                t('attendance.geofenceError')
            );
            return;
        }

        setActionLoading(true);

        try {
            const clockOutTime = new Date();
            const clockInTime = new Date(todayAttendance.clock_in_time);
            const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

            const { data, error } = await supabase
                .from('attendance_records')
                .update({
                    clock_out_time: clockOutTime.toISOString(),
                    clock_out_location: `POINT(${currentLocation.coords.longitude} ${currentLocation.coords.latitude})`,
                    clock_out_device_id: employee?.device_id || 'unknown',
                    total_hours: totalHours,
                })
                .eq('id', todayAttendance.id)
                .select()
                .single();

            if (error) throw error;

            setTodayAttendance(data);
            Alert.alert(t('common.success'), t('attendance.clockOutSuccess'));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const isClockedIn = todayAttendance && !todayAttendance.clock_out_time;

    const content = (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
            {/* Status Card */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('attendance.currentStatus')}</Text>

                    <View style={styles.statusContainer}>
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: isClockedIn ? theme.colors.success : theme.colors.textSecondary }
                        ]} />
                        <Text style={[styles.statusText, { color: theme.colors.text }]}>
                            {isClockedIn ? t('attendance.clockedIn') : t('attendance.clockedOut')}
                        </Text>
                    </View>

                    {todayAttendance && (
                        <View style={[styles.timeInfo, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.timeItem}>
                                <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>{t('attendance.clockInTime')}</Text>
                                <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                                    {new Date(todayAttendance.clock_in_time).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                            {todayAttendance.clock_out_time && (
                                <View style={styles.timeItem}>
                                    <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>{t('attendance.clockOutTime')}</Text>
                                    <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                                        {new Date(todayAttendance.clock_out_time).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                            )}
                            {todayAttendance.total_hours && (
                                <View style={styles.timeItem}>
                                    <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>{t('attendance.totalHours')}</Text>
                                    <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                                        {todayAttendance.total_hours.toFixed(1)}h
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Location Card */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Location Status</Text>

                    <View style={styles.locationInfo}>
                        <View style={styles.locationItem}>
                            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>{t('attendance.distance')}</Text>
                            <Text style={[
                                styles.locationValue,
                                { color: isInRange ? theme.colors.success : theme.colors.error }
                            ]}>
                                {formatDistance(distance)}
                            </Text>
                        </View>
                        <View style={styles.locationItem}>
                            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>Status</Text>
                            <View style={styles.rangeIndicator}>
                                <View style={[
                                    styles.rangeDot,
                                    { backgroundColor: isInRange ? theme.colors.success : theme.colors.error }
                                ]} />
                                <Text style={[
                                    styles.rangeText,
                                    { color: isInRange ? theme.colors.success : theme.colors.error }
                                ]}>
                                    {isInRange ? t('attendance.withinRange') : t('attendance.outsideRange')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {!isInRange && (
                        <View style={[styles.warningContainer, { backgroundColor: theme.colors.error + '20' }]}>
                            <Text style={[styles.warningText, { color: theme.colors.error }]}>
                                {t('attendance.geofenceError')}
                            </Text>
                        </View>
                    )}
                </Card.Content>
            </Card>

            {/* Action Button */}
            <View style={styles.actionContainer}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: isClockedIn ? theme.colors.error : theme.colors.success,
                            opacity: isInRange ? 1 : 0.5,
                        },
                    ]}
                    onPress={isClockedIn ? handleClockOut : handleClockIn}
                    disabled={!isInRange || actionLoading}
                >
                    {actionLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Text style={styles.actionButtonIcon}>
                                {isClockedIn ? '🚪' : '👋'}
                            </Text>
                            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                                {isClockedIn ? t('attendance.clockOut') : t('attendance.clockIn')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Info Card */}
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Text style={[styles.infoTitle, { color: theme.colors.text }]}>How it works</Text>
                    <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                        • You must be within {store?.geofence_radius}m of your work location{'\n'}
                        • GPS must be enabled on your device{'\n'}
                        • Use the same registered device for attendance{'\n'}
                        • Clock in when you arrive and clock out when you leave
                    </Text>
                </Card.Content>
            </Card>
        </ScrollView>
    );

    return content;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    cardTitle: {
        ...Typography.h5,
        marginBottom: Spacing.md,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: Spacing.sm,
    },
    statusText: {
        ...Typography.h4,
    },
    timeInfo: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
    },
    timeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    timeLabel: {
        ...Typography.body,
    },
    timeValue: {
        ...Typography.body,
        fontWeight: '600',
    },
    locationInfo: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.md,
    },
    locationItem: {
        alignItems: 'center',
    },
    locationLabel: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
    },
    locationValue: {
        ...Typography.h3,
        fontWeight: '700',
    },
    rangeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rangeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Spacing.xs,
    },
    rangeText: {
        ...Typography.body,
        fontWeight: '600',
    },
    warningContainer: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    warningText: {
        ...Typography.caption,
        textAlign: 'center',
    },
    actionContainer: {
        marginVertical: Spacing.lg,
    },
    actionButton: {
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.large,
    },
    actionButtonIcon: {
        fontSize: 60,
        marginBottom: Spacing.sm,
    },
    actionButtonText: {
        ...Typography.h3,
        fontWeight: '700',
    },
    infoTitle: {
        ...Typography.h5,
        marginBottom: Spacing.sm,
    },
    infoText: {
        ...Typography.caption,
        lineHeight: 20,
    },
});
