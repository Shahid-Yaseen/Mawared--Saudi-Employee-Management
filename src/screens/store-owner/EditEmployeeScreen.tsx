import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { adminApi } from '../../services/adminApi';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function EditEmployeeScreen({ navigation, route }: any) {
    const { employeeId, initialData } = route.params;
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(false);

    // Form fields
    const [fullName, setFullName] = useState(initialData?.profiles?.full_name || '');
    const [phone, setPhone] = useState(initialData?.profiles?.phone || '');
    const [department, setDepartment] = useState(initialData?.department || '');
    const [position, setPosition] = useState(initialData?.position || '');
    const [salary, setSalary] = useState(initialData?.salary?.toString() || '');
    const [hireDate, setHireDate] = useState(initialData?.hire_date || '');

    const [errors, setErrors] = useState<any>({});

    const validate = () => {
        const newErrors: any = {};
        if (!fullName) newErrors.fullName = 'Full name is required';
        if (!department) newErrors.department = 'Department is required';
        if (!position) newErrors.position = 'Position is required';
        if (!salary || isNaN(parseFloat(salary))) newErrors.salary = 'Valid salary is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const result = await adminApi.updateEmployee({
                employeeId,
                fullName,
                phone,
                department,
                position,
                salary,
                hireDate,
            });

            if (result.success) {
                if (Platform.OS === 'web') {
                    alert('Employee updated successfully');
                    navigation.goBack();
                } else {
                    Alert.alert('Success', 'Employee updated successfully', [
                        { text: 'OK', onPress: () => navigation.goBack() }
                    ]);
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update employee');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Edit Employee</Text>

                <TextInput
                    label="Full Name *"
                    value={fullName}
                    onChangeText={setFullName}
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.fullName}
                />
                {errors.fullName && <HelperText type="error">{errors.fullName}</HelperText>}

                <TextInput
                    label="Phone Number"
                    value={phone}
                    onChangeText={setPhone}
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label="Department *"
                    value={department}
                    onChangeText={setDepartment}
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.department}
                />
                {errors.department && <HelperText type="error">{errors.department}</HelperText>}

                <TextInput
                    label="Position *"
                    value={position}
                    onChangeText={setPosition}
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.position}
                />
                {errors.position && <HelperText type="error">{errors.position}</HelperText>}

                <TextInput
                    label="Monthly Salary (SAR) *"
                    value={salary}
                    onChangeText={setSalary}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    error={!!errors.salary}
                />
                {errors.salary && <HelperText type="error">{errors.salary}</HelperText>}

                <TextInput
                    label="Hire Date (YYYY-MM-DD)"
                    value={hireDate}
                    onChangeText={setHireDate}
                    mode="outlined"
                    style={styles.input}
                />

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    style={styles.saveButton}
                >
                    Save Changes
                </Button>

                <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.cancelButton}
                >
                    Cancel
                </Button>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.lg },
    title: { ...Typography.h4, marginBottom: Spacing.lg },
    input: { marginBottom: Spacing.sm },
    saveButton: { marginTop: Spacing.lg },
    cancelButton: { marginTop: Spacing.sm },
});
