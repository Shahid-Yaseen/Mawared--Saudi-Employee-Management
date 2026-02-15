import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function ReportsScreen({ navigation }: any) {
    const reports = [
        {
            title: 'Attendance Report',
            description: 'View attendance statistics across all stores',
            icon: 'calendar',
            color: Colors.primary,
            onPress: () => navigation.navigate('AttendanceReport'),
        },
        {
            title: 'Leave Report',
            description: 'Analyze leave patterns and balances',
            icon: 'time',
            color: Colors.warning,
            onPress: () => navigation.navigate('LeaveReport'),
        },
        {
            title: 'Payroll Report',
            description: 'Monthly payroll summaries and trends',
            icon: 'cash',
            color: Colors.success,
            onPress: () => navigation.navigate('PayrollReport'),
        },
        {
            title: 'Employee Report',
            description: 'Employee demographics and statistics',
            icon: 'people',
            color: Colors.info,
            onPress: () => navigation.navigate('EmployeeReport'),
        },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Title style={styles.headerTitle}>Reports & Analytics</Title>
            </View>

            {reports.map((report, index) => (
                <Card key={index} style={styles.card} onPress={report.onPress}>
                    <Card.Content style={styles.cardContent}>
                        <View style={[styles.iconContainer, { backgroundColor: report.color + '20' }]}>
                            <Ionicons name={report.icon as any} size={32} color={report.color} />
                        </View>
                        <View style={styles.reportInfo}>
                            <Text style={styles.reportTitle}>{report.title}</Text>
                            <Text style={styles.reportDescription}>{report.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
                    </Card.Content>
                </Card>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 20,
        backgroundColor: Colors.primary,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
    },
    card: {
        margin: 10,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    reportInfo: {
        flex: 1,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    reportDescription: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
});
