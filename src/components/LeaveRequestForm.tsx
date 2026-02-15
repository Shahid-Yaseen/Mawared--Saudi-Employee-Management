import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { Card, Button, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../store/ThemeContext';
import { Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../services/supabase';

interface LeaveType {
    id: string;
    name: string;
    max_days: number;
}

interface LeaveBalance {
    leave_type_id: string;
    remaining_days: number;
}

interface LeaveRequestFormProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    leaveTypes: LeaveType[];
    leaveBalances: LeaveBalance[];
}

export default function LeaveRequestForm({
    visible,
    onClose,
    onSuccess,
    employeeId,
    leaveTypes,
    leaveBalances,
}: LeaveRequestFormProps) {
    const { theme } = useTheme();
    const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const calculateWorkingDays = (start: Date, end: Date): number => {
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const day = current.getDay();
            // Exclude Friday (5) and Saturday (6) - Saudi weekend
            if (day !== 5 && day !== 6) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const getAvailableDays = (leaveTypeId: string): number => {
        const balance = leaveBalances.find((b) => b.leave_type_id === leaveTypeId);
        return balance?.remaining_days || 0;
    };

    const requestedDays = calculateWorkingDays(startDate, endDate);
    const availableDays = selectedLeaveType ? getAvailableDays(selectedLeaveType) : 0;
    const isValid = selectedLeaveType && reason.trim().length > 0 && requestedDays <= availableDays;

    const handleSubmit = async () => {
        if (!isValid) {
            Alert.alert('Error', 'Please fill all fields and ensure you have enough leave balance');
            return;
        }

        setLoading(true);
        try {
            // Check for overlapping requests
            const { data: existingRequests } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('employee_id', employeeId)
                .or(`and(start_date.lte.${endDate.toISOString().split('T')[0]},end_date.gte.${startDate.toISOString().split('T')[0]})`)
                .in('status', ['pending', 'approved']);

            if (existingRequests && existingRequests.length > 0) {
                Alert.alert('Conflict', 'You have an overlapping leave request for these dates');
                setLoading(false);
                return;
            }

            // Create leave request
            const { error } = await supabase.from('leave_requests').insert({
                employee_id: employeeId,
                leave_type_id: selectedLeaveType,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                days_requested: requestedDays,
                reason: reason.trim(),
                status: 'pending',
            });

            if (error) throw error;

            Alert.alert('Success', 'Leave request submitted successfully');
            resetForm();
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error submitting leave request:', error);
            Alert.alert('Error', error.message || 'Failed to submit leave request');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedLeaveType('');
        setStartDate(new Date());
        setEndDate(new Date());
        setReason('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>Request Leave</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Leave Type Selection */}
                        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Leave Type *</Text>
                                <View style={styles.chipContainer}>
                                    {leaveTypes.map((type) => {
                                        const available = getAvailableDays(type.id);
                                        return (
                                            <Chip
                                                key={type.id}
                                                selected={selectedLeaveType === type.id}
                                                onPress={() => setSelectedLeaveType(type.id)}
                                                style={[
                                                    styles.chip,
                                                    selectedLeaveType === type.id && {
                                                        backgroundColor: theme.colors.primary,
                                                    },
                                                ]}
                                                textStyle={{
                                                    color:
                                                        selectedLeaveType === type.id
                                                            ? '#FFFFFF'
                                                            : theme.colors.text,
                                                }}
                                            >
                                                {type.name} ({available} days)
                                            </Chip>
                                        );
                                    })}
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Date Selection */}
                        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Start Date *</Text>
                                <TouchableOpacity
                                    style={[styles.dateButton, { borderColor: theme.colors.divider }]}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <MaterialCommunityIcons
                                        name="calendar"
                                        size={20}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={[styles.dateText, { color: theme.colors.text }]}>
                                        {startDate.toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>

                                {showStartPicker && (
                                    <DateTimePicker
                                        value={startDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, date) => {
                                            setShowStartPicker(Platform.OS === 'ios');
                                            if (date) {
                                                setStartDate(date);
                                                if (date > endDate) setEndDate(date);
                                            }
                                        }}
                                        minimumDate={new Date()}
                                    />
                                )}

                                <Text style={[styles.label, { color: theme.colors.text, marginTop: Spacing.md }]}>
                                    End Date *
                                </Text>
                                <TouchableOpacity
                                    style={[styles.dateButton, { borderColor: theme.colors.divider }]}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <MaterialCommunityIcons
                                        name="calendar"
                                        size={20}
                                        color={theme.colors.primary}
                                    />
                                    <Text style={[styles.dateText, { color: theme.colors.text }]}>
                                        {endDate.toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>

                                {showEndPicker && (
                                    <DateTimePicker
                                        value={endDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, date) => {
                                            setShowEndPicker(Platform.OS === 'ios');
                                            if (date) setEndDate(date);
                                        }}
                                        minimumDate={startDate}
                                    />
                                )}

                                {/* Days Summary */}
                                <View style={[styles.summaryBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                    <Text style={[styles.summaryText, { color: theme.colors.text }]}>
                                        Requested Days: <Text style={{ fontWeight: '700' }}>{requestedDays}</Text>
                                    </Text>
                                    <Text style={[styles.summaryText, { color: theme.colors.text }]}>
                                        Available Days: <Text style={{ fontWeight: '700' }}>{availableDays}</Text>
                                    </Text>
                                    {requestedDays > availableDays && (
                                        <Text style={[styles.errorText, { color: theme.colors.error }]}>
                                            Insufficient leave balance
                                        </Text>
                                    )}
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Reason */}
                        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Reason *</Text>
                                <TextInput
                                    mode="outlined"
                                    value={reason}
                                    onChangeText={setReason}
                                    placeholder="Enter reason for leave"
                                    multiline
                                    numberOfLines={4}
                                    style={styles.textInput}
                                    outlineColor={theme.colors.divider}
                                    activeOutlineColor={theme.colors.primary}
                                    textColor={theme.colors.text}
                                />
                            </Card.Content>
                        </Card>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <Button
                                mode="outlined"
                                onPress={handleClose}
                                style={[styles.button, { borderColor: theme.colors.divider }]}
                                labelStyle={{ color: theme.colors.text }}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSubmit}
                                loading={loading}
                                disabled={!isValid || loading}
                                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                                labelStyle={{ color: '#FFFFFF' }}
                            >
                                Submit Request
                            </Button>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '90%',
        ...Shadows.large,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        ...Typography.h4,
        fontWeight: '700',
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    label: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        marginRight: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        gap: Spacing.sm,
    },
    dateText: {
        ...Typography.body,
    },
    summaryBox: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
    },
    summaryText: {
        ...Typography.body,
        marginBottom: Spacing.xs,
    },
    errorText: {
        ...Typography.caption,
        fontWeight: '600',
        marginTop: Spacing.xs,
    },
    textInput: {
        backgroundColor: 'transparent',
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
    button: {
        flex: 1,
        borderRadius: BorderRadius.md,
    },
});
