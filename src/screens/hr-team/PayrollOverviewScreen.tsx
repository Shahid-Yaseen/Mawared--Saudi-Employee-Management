import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Card, Title, Paragraph, DataTable, Chip, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

export default function PayrollOverviewScreen() {
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [summary, setSummary] = useState({
        totalPayroll: 0,
        pendingCount: 0,
        paidCount: 0,
    });
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPayrollData();
    }, []);

    const loadPayrollData = async () => {
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const { data, error } = await supabase
                .from('payslips')
                .select(`
          *,
          employees!inner(
            employee_number,
            profiles!inner(full_name),
            stores!inner(store_name)
          )
        `)
                .eq('month', currentMonth)
                .eq('year', currentYear);

            if (error) throw error;

            setPayrollData(data || []);

            const total = data?.reduce((sum, p) => sum + parseFloat(p.net_salary), 0) || 0;
            const pending = data?.filter(p => p.status === 'pending').length || 0;
            const paid = data?.filter(p => p.status === 'paid').length || 0;

            setSummary({ totalPayroll: total, pendingCount: pending, paidCount: paid });
        } catch (error) {
            console.error('Error loading payroll:', error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadPayrollData} />}
        >
            <Card style={styles.card}>
                <Card.Content>
                    <Title>Payroll Summary</Title>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>SAR {summary.totalPayroll.toFixed(2)}</Text>
                            <Text style={styles.summaryLabel}>Total Payroll</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{summary.pendingCount}</Text>
                            <Text style={styles.summaryLabel}>Pending</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryValue}>{summary.paidCount}</Text>
                            <Text style={styles.summaryLabel}>Paid</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Content>
                    <Title>Payslips by Store</Title>
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title>Employee</DataTable.Title>
                            <DataTable.Title>Store</DataTable.Title>
                            <DataTable.Title numeric>Net Salary</DataTable.Title>
                            <DataTable.Title>Status</DataTable.Title>
                        </DataTable.Header>

                        {payrollData.map((payslip) => (
                            <DataTable.Row key={payslip.id}>
                                <DataTable.Cell>{payslip.employees.profiles.full_name}</DataTable.Cell>
                                <DataTable.Cell>{payslip.employees.stores.store_name}</DataTable.Cell>
                                <DataTable.Cell numeric>SAR {payslip.net_salary}</DataTable.Cell>
                                <DataTable.Cell>
                                    <Chip
                                        mode="flat"
                                        style={{
                                            backgroundColor:
                                                payslip.status === 'paid' ? Colors.success + '20' : Colors.warning + '20',
                                        }}
                                        textStyle={{
                                            color: payslip.status === 'paid' ? Colors.success : Colors.warning,
                                        }}
                                    >
                                        {payslip.status}
                                    </Chip>
                                </DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </DataTable>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    card: {
        margin: 10,
        elevation: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    summaryLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 4,
    },
});
