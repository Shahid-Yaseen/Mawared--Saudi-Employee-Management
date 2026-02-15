import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Card, Button, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { supabase } from '../services/supabase';

interface RequestType {
    id: string;
    name: string;
    requires_amount: boolean;
    description?: string;
}

interface EmployeeRequestFormProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    requestTypes: RequestType[];
}

export default function EmployeeRequestForm({
    visible,
    onClose,
    onSuccess,
    employeeId,
    requestTypes,
}: EmployeeRequestFormProps) {
    const { theme } = useTheme();
    const [selectedType, setSelectedType] = useState<string>('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const selectedRequestType = requestTypes.find((t) => t.id === selectedType);
    const isValid =
        selectedType &&
        description.trim().length > 0 &&
        (!selectedRequestType?.requires_amount || (amount && parseFloat(amount) > 0));

    const handleSubmit = async () => {
        if (!isValid) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const requestData: any = {
                employee_id: employeeId,
                request_type_id: selectedType,
                description: description.trim(),
                status: 'pending',
            };

            if (selectedRequestType?.requires_amount) {
                requestData.amount = parseFloat(amount);
            }

            const { error } = await supabase.from('employee_requests').insert(requestData);

            if (error) throw error;

            Alert.alert('Success', 'Request submitted successfully');
            resetForm();
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error submitting request:', error);
            Alert.alert('Error', error.message || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedType('');
        setAmount('');
        setDescription('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const getRequestIcon = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('salary') || lowerName.includes('certificate')) return 'certificate';
        if (lowerName.includes('experience') || lowerName.includes('letter')) return 'file-document';
        if (lowerName.includes('housing') || lowerName.includes('allowance')) return 'home';
        if (lowerName.includes('loan')) return 'cash';
        if (lowerName.includes('bonus')) return 'gift';
        if (lowerName.includes('advance')) return 'cash-fast';
        return 'file-document-outline';
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>New Request</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Request Type Selection */}
                        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <Text style={[styles.label, { color: theme.colors.text }]}>Request Type *</Text>
                                <View style={styles.typeGrid}>
                                    {requestTypes.map((type) => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={[
                                                styles.typeCard,
                                                {
                                                    backgroundColor:
                                                        selectedType === type.id
                                                            ? theme.colors.primary + '20'
                                                            : theme.colors.divider + '20',
                                                    borderColor:
                                                        selectedType === type.id
                                                            ? theme.colors.primary
                                                            : 'transparent',
                                                },
                                            ]}
                                            onPress={() => setSelectedType(type.id)}
                                        >
                                            <MaterialCommunityIcons
                                                name={getRequestIcon(type.name)}
                                                size={32}
                                                color={
                                                    selectedType === type.id
                                                        ? theme.colors.primary
                                                        : theme.colors.textSecondary
                                                }
                                            />
                                            <Text
                                                style={[
                                                    styles.typeName,
                                                    {
                                                        color:
                                                            selectedType === type.id
                                                                ? theme.colors.primary
                                                                : theme.colors.text,
                                                    },
                                                ]}
                                            >
                                                {type.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Amount (if required) */}
                        {selectedRequestType?.requires_amount && (
                            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Card.Content>
                                    <Text style={[styles.label, { color: theme.colors.text }]}>Amount (SAR) *</Text>
                                    <TextInput
                                        mode="outlined"
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="Enter amount"
                                        keyboardType="numeric"
                                        style={styles.textInput}
                                        outlineColor={theme.colors.divider}
                                        activeOutlineColor={theme.colors.primary}
                                        textColor={theme.colors.text}
                                        left={<TextInput.Icon icon="currency-usd" />}
                                    />
                                </Card.Content>
                            </Card>
                        )}

                        {/* Description */}
                        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <Text style={[styles.label, { color: theme.colors.text }]}>
                                    Description / Reason *
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Provide details about your request"
                                    multiline
                                    numberOfLines={5}
                                    style={styles.textInput}
                                    outlineColor={theme.colors.divider}
                                    activeOutlineColor={theme.colors.primary}
                                    textColor={theme.colors.text}
                                />
                                <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                                    Please provide clear details to help process your request faster
                                </Text>
                            </Card.Content>
                        </Card>

                        {/* Info Box */}
                        {selectedRequestType && (
                            <View style={[styles.infoBox, { backgroundColor: theme.colors.info + '10' }]}>
                                <MaterialCommunityIcons
                                    name="information"
                                    size={20}
                                    color={theme.colors.info}
                                    style={styles.infoIcon}
                                />
                                <Text style={[styles.infoText, { color: theme.colors.text }]}>
                                    Your request will be reviewed by HR/Management. You'll receive a notification once
                                    it's processed.
                                </Text>
                            </View>
                        )}

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
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    typeCard: {
        width: '48%',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 2,
    },
    typeName: {
        ...Typography.caption,
        fontWeight: '600',
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    textInput: {
        backgroundColor: 'transparent',
    },
    hint: {
        ...Typography.caption,
        marginTop: Spacing.xs,
        fontStyle: 'italic',
    },
    infoBox: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    infoIcon: {
        marginRight: Spacing.sm,
        marginTop: 2,
    },
    infoText: {
        ...Typography.caption,
        flex: 1,
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
