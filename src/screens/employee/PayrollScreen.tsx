import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { formatCurrency } from '../../utils/helpers';
import SidebarLayout from '../../components/SidebarLayout';

export default function PayrollScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentPayroll, setCurrentPayroll] = useState<any>(null);
    const [payrollHistory, setPayrollHistory] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: empData } = await supabase
                .from('employees')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (empData) {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();

                // Get current month payroll
                const { data: currentData } = await supabase
                    .from('payroll_records')
                    .select('*')
                    .eq('employee_id', empData.id)
                    .eq('month', currentMonth)
                    .eq('year', currentYear)
                    .maybeSingle();

                setCurrentPayroll(currentData);

                // Get payroll history
                const { data: historyData } = await supabase
                    .from('payroll_records')
                    .select('*')
                    .eq('employee_id', empData.id)
                    .order('year', { ascending: false })
                    .order('month', { ascending: false })
                    .limit(12);

                setPayrollHistory(historyData || []);
            }
        } catch (error) {
            console.error('Error loading payroll:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getMonthName = (month: number) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1];
    };

    const content = (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            {/* Current Month */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('payroll.currentMonth')}</Text>
            {currentPayroll ? (
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.salaryContainer}>
                            <Text style={[styles.salaryLabel, { color: theme.colors.textSecondary }]}>{t('payroll.netSalary')}</Text>
                            <Text style={[styles.salaryAmount, { color: theme.colors.primary }]}>
                                {formatCurrency(currentPayroll.net_salary)}
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                        <View style={styles.detailsContainer}>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{t('payroll.baseSalary')}</Text>
                                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                    {formatCurrency(currentPayroll.base_salary)}
                                </Text>
                            </View>

                            {currentPayroll.overtime_amount > 0 && (
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                                        {t('payroll.overtime')} ({currentPayroll.overtime_hours}h)
                                    </Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                                        +{formatCurrency(currentPayroll.overtime_amount)}
                                    </Text>
                                </View>
                            )}

                            {Object.keys(currentPayroll.allowances || {}).map((key) => (
                                <View key={key} style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{key}</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                                        +{formatCurrency(currentPayroll.allowances[key])}
                                    </Text>
                                </View>
                            ))}

                            {Object.keys(currentPayroll.deductions || {}).map((key) => (
                                <View key={key} style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{key}</Text>
                                    <Text style={[styles.detailValue, { color: theme.colors.error }]}>
                                        -{formatCurrency(currentPayroll.deductions[key])}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {currentPayroll.payslip_url && (
                            <Button
                                mode="outlined"
                                onPress={() => {/* Download payslip */ }}
                                style={[styles.downloadButton, { borderColor: theme.colors.primary }]}
                                labelStyle={{ color: theme.colors.primary }}
                                icon="download"
                            >
                                {t('payroll.downloadPayslip')}
                            </Button>
                        )}
                    </Card.Content>
                </Card>
            ) : (
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No payroll data for current month
                        </Text>
                    </Card.Content>
                </Card>
            )}

            {/* History */}
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('payroll.history')}</Text>
            {payrollHistory.map((payroll) => (
                <Card key={payroll.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.historyHeader}>
                            <Text style={[styles.historyMonth, { color: theme.colors.text }]}>
                                {getMonthName(payroll.month)} {payroll.year}
                            </Text>
                            <Text style={[styles.historyAmount, { color: theme.colors.primary }]}>
                                {formatCurrency(payroll.net_salary)}
                            </Text>
                        </View>
                        <View style={styles.historyDetails}>
                            <Text style={[styles.historyDetail, { color: theme.colors.textSecondary }]}>
                                Base: {formatCurrency(payroll.base_salary)}
                            </Text>
                            {payroll.overtime_amount > 0 && (
                                <Text style={[styles.historyDetail, { color: theme.colors.textSecondary }]}>
                                    OT: +{formatCurrency(payroll.overtime_amount)}
                                </Text>
                            )}
                        </View>
                    </Card.Content>
                </Card>
            ))}
        </ScrollView>
    );

    return isLargeScreen ? (
        <SidebarLayout navigation={navigation} activeRoute="Payroll">
            {content}
        </SidebarLayout>
    ) : (
        content
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
    },
    sectionTitle: {
        ...Typography.h4,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    salaryContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    salaryLabel: {
        ...Typography.body,
        marginBottom: Spacing.xs,
    },
    salaryAmount: {
        ...Typography.h1,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: Spacing.md,
    },
    detailsContainer: {
        marginBottom: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    detailLabel: {
        ...Typography.body,
    },
    detailValue: {
        ...Typography.body,
        fontWeight: '600',
    },
    downloadButton: {
        borderRadius: BorderRadius.md,
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    historyMonth: {
        ...Typography.h5,
    },
    historyAmount: {
        ...Typography.h5,
        fontWeight: '700',
    },
    historyDetails: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    historyDetail: {
        ...Typography.caption,
    },
});
