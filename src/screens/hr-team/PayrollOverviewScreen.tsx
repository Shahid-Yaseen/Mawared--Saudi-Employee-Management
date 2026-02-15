import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Card, Title, DataTable, Chip } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';

export default function PayrollOverviewScreen() {
    const { theme } = useTheme();
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
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadPayrollData} tintColor={theme.colors.primary} />
            }
        >
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Title style={{ color: theme.colors.text }}>Payroll Summary</Title>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>SAR {summary.totalPayroll.toFixed(1)}</Text>
                            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Payroll</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.pendingCount}</Text>
                            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Pending</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{summary.paidCount}</Text>
                            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Paid</Text>
                        </View>
                    </View>
                </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Title style={{ color: theme.colors.text }}>Payslips by Store</Title>
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title textStyle={{ color: theme.colors.text }}>Employee</DataTable.Title>
                            <DataTable.Title textStyle={{ color: theme.colors.text }}>Store</DataTable.Title>
                            <DataTable.Title numeric textStyle={{ color: theme.colors.text }}>Net Salary</DataTable.Title>
                            <DataTable.Title textStyle={{ color: theme.colors.text }}>Status</DataTable.Title>
                        </DataTable.Header>

                        {payrollData.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={{ color: theme.colors.textSecondary }}>No payroll data for this month</Text>
                            </View>
                        ) : (
                            payrollData.map((payslip) => (
                                <DataTable.Row key={payslip.id}>
                                    <DataTable.Cell textStyle={{ color: theme.colors.text }}>{payslip.employees.profiles.full_name}</DataTable.Cell>
                                    <DataTable.Cell textStyle={{ color: theme.colors.text }}>{payslip.employees.stores.store_name}</DataTable.Cell>
                                    <DataTable.Cell numeric textStyle={{ color: theme.colors.text }}>SAR {payslip.net_salary}</DataTable.Cell>
                                    <DataTable.Cell>
                                        <Chip
                                            mode="flat"
                                            style={{
                                                backgroundColor:
                                                    payslip.status === 'paid' ? theme.colors.success + '20' : theme.colors.warning + '20',
                                            }}
                                            textStyle={{
                                                color: payslip.status === 'paid' ? theme.colors.success : theme.colors.warning,
                                                fontSize: 10,
                                            }}
                                        >
                                            {payslip.status}
                                        </Chip>
                                    </DataTable.Cell>
                                </DataTable.Row>
                            ))
                        )}
                    </DataTable>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        fontSize: 20,
        fontWeight: 'bold',
    },
    summaryLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
});
