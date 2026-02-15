import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { Spacing, Typography, BorderRadius } from '../constants/theme';

interface AttendanceDay {
    date: string;
    status: 'present' | 'late' | 'absent' | 'leave' | 'weekend' | 'future';
    hours?: number;
    isLate?: boolean;
}

interface AttendanceCalendarProps {
    month: number;
    year: number;
    attendanceData: AttendanceDay[];
    onDayPress?: (day: AttendanceDay) => void;
    onMonthChange?: (month: number, year: number) => void;
}

export default function AttendanceCalendar({
    month,
    year,
    attendanceData,
    onDayPress,
    onMonthChange,
}: AttendanceCalendarProps) {
    const { theme } = useTheme();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present':
                return theme.colors.success;
            case 'late':
                return theme.colors.warning;
            case 'absent':
                return theme.colors.error;
            case 'leave':
                return theme.colors.info;
            case 'weekend':
                return theme.colors.divider;
            case 'future':
                return theme.colors.textSecondary + '30';
            default:
                return theme.colors.divider;
        }
    };

    const getAttendanceForDate = (day: number): AttendanceDay | null => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return attendanceData.find(a => a.date === dateStr) || null;
    };

    const handlePrevMonth = () => {
        if (month === 0) {
            onMonthChange?.(11, year - 1);
        } else {
            onMonthChange?.(month - 1, year);
        }
    };

    const handleNextMonth = () => {
        if (month === 11) {
            onMonthChange?.(0, year + 1);
        } else {
            onMonthChange?.(month + 1, year);
        }
    };

    const renderCalendarDays = () => {
        const days = [];
        const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const dayNumber = i - firstDayOfMonth + 1;
            const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

            if (isValidDay) {
                const attendance = getAttendanceForDate(dayNumber);
                const dayOfWeek = new Date(year, month, dayNumber).getDay();
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday
                const isFuture = new Date(year, month, dayNumber) > new Date();

                let status = 'absent';
                if (isFuture) status = 'future';
                else if (isWeekend) status = 'weekend';
                else if (attendance) status = attendance.status;

                const backgroundColor = getStatusColor(status);

                days.push(
                    <TouchableOpacity
                        key={i}
                        style={[
                            styles.dayCell,
                            { backgroundColor: backgroundColor + '20', borderColor: backgroundColor },
                        ]}
                        onPress={() => attendance && onDayPress?.(attendance)}
                        disabled={!attendance || isFuture}
                    >
                        <Text
                            style={[
                                styles.dayNumber,
                                { color: isFuture ? theme.colors.textSecondary : theme.colors.text },
                            ]}
                        >
                            {dayNumber}
                        </Text>
                        {attendance?.isLate && (
                            <MaterialCommunityIcons
                                name="clock-alert"
                                size={10}
                                color={theme.colors.warning}
                                style={styles.lateIcon}
                            />
                        )}
                    </TouchableOpacity>
                );
            } else {
                days.push(<View key={i} style={styles.emptyCell} />);
            }
        }

        return days;
    };

    return (
        <Card style={[styles.container, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.monthYear, { color: theme.colors.text }]}>
                        {monthNames[month]} {year}
                    </Text>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Day Names */}
                <View style={styles.dayNamesRow}>
                    {dayNames.map((day) => (
                        <View key={day} style={styles.dayNameCell}>
                            <Text style={[styles.dayName, { color: theme.colors.textSecondary }]}>{day}</Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>{renderCalendarDays()}</View>

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Present</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Late</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.error }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Absent</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: theme.colors.info }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Leave</Text>
                    </View>
                </View>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BorderRadius.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    navButton: {
        padding: Spacing.xs,
    },
    monthYear: {
        ...Typography.h5,
        fontWeight: '700',
    },
    dayNamesRow: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    dayNameCell: {
        flex: 1,
        alignItems: 'center',
    },
    dayName: {
        ...Typography.caption,
        fontWeight: '600',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.xs,
        position: 'relative',
    },
    emptyCell: {
        width: '14.28%',
        aspectRatio: 1,
    },
    dayNumber: {
        ...Typography.body,
        fontWeight: '600',
    },
    lateIcon: {
        position: 'absolute',
        top: 2,
        right: 2,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: Spacing.xs,
    },
    legendText: {
        ...Typography.caption,
    },
});
