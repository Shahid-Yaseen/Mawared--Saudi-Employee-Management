import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { Card, Title, Paragraph, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { supabase } from '../../services/supabase';
import { adminApi } from '../../services/adminApi';

export default function EmployeeDetailsScreen({ route }: any) {
    const { employeeId } = route.params;
    const { theme } = useTheme();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEmployee();
    }, []);

    const loadEmployee = async () => {
        try {
            console.log('API CALL: getEmployeeDetails for:', employeeId);
            const result = await adminApi.getEmployeeDetails(employeeId);
            if (result.success) {
                setEmployee(result.employee);
            }
        } catch (error) {
            console.error('Error loading employee details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;
    if (!employee) return <View style={styles.center}><Text>Employee not found</Text></View>;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name="account-circle" size={100} color={theme.colors.primary} />
                </View>
                <Text style={[styles.name, { color: theme.colors.text }]}>{employee.profiles?.full_name}</Text>
                <Chip style={styles.statusChip}>{employee.status}</Chip>
            </View>

            <View style={styles.content}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Title>Personal Information</Title>
                        <Divider style={styles.divider} />
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="email" size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.infoText}>{employee.profiles?.email}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons name="phone" size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.infoText}>{employee.profiles?.phone || 'Not provided'}</Text>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={[styles.card, { marginTop: Spacing.md }]}>
                    <Card.Content>
                        <Title>Employment Details</Title>
                        <Divider style={styles.divider} />
                        <View style={styles.grid}>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Employee ID</Text>
                                <Text style={styles.value}>{employee.employee_number}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Department</Text>
                                <Text style={styles.value}>{employee.department}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Position</Text>
                                <Text style={styles.value}>{employee.position}</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Salary</Text>
                                <Text style={styles.value}>{employee.salary} SAR</Text>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Hire Date</Text>
                                <Text style={styles.value}>{employee.hire_date}</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', padding: Spacing.xl },
    avatarContainer: { marginBottom: Spacing.md },
    name: { ...Typography.h4, marginBottom: Spacing.xs },
    statusChip: { marginTop: Spacing.xs },
    content: { padding: Spacing.md },
    card: { borderRadius: BorderRadius.lg, ...Shadows.small },
    divider: { marginVertical: Spacing.sm },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: 10 },
    infoText: { ...Typography.body },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    gridItem: { width: '45%', marginBottom: Spacing.sm },
    label: { ...Typography.caption, color: '#666' },
    value: { ...Typography.body, fontWeight: '600' },
});
