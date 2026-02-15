import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    useWindowDimensions,
} from 'react-native';
import { Card, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';


export default function RequestsScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [employeeId, setEmployeeId] = useState<string>('');

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
                setEmployeeId(empData.id);

                const { data: requestsData } = await supabase
                    .from('employee_requests')
                    .select('*, request_types(*)')
                    .eq('employee_id', empData.id)
                    .order('created_at', { ascending: false });

                setRequests(requestsData || []);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return theme.colors.success;
            case 'rejected': return theme.colors.error;
            case 'pending': return theme.colors.warning;
            default: return theme.colors.textSecondary;
        }
    };

    const content = (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {requests.length === 0 ? (
                    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                        <Card.Content>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No requests yet</Text>
                        </Card.Content>
                    </Card>
                ) : (
                    requests.map((request) => (
                        <Card key={request.id} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                            <Card.Content>
                                <View style={styles.requestHeader}>
                                    <Text style={[styles.requestType, { color: theme.colors.text }]}>
                                        {request.request_types?.name || 'Request'}
                                    </Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: getStatusColor(request.status) + '20' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                { color: getStatusColor(request.status) },
                                            ]}
                                        >
                                            {t(`requests.${request.status}`)}
                                        </Text>
                                    </View>
                                </View>

                                {request.amount && (
                                    <Text style={[styles.amount, { color: theme.colors.primary }]}>
                                        Amount: {request.amount} {t('payroll.sar')}
                                    </Text>
                                )}

                                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{request.description}</Text>

                                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                                    {new Date(request.created_at).toLocaleDateString()}
                                </Text>

                                {request.rejection_reason && (
                                    <View style={[styles.rejectionContainer, { backgroundColor: theme.dark ? '#3E2723' : '#FFEBEE' }]}>
                                        <Text style={[styles.rejectionLabel, { color: theme.colors.error }]}>Rejection Reason:</Text>
                                        <Text style={[styles.rejectionText, { color: theme.colors.error }]}>
                                            {request.rejection_reason}
                                        </Text>
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <FAB
                icon="plus"
                label="New Request"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary || '#FFFFFF'}
                onPress={() => navigation.navigate('NewRequest', { employeeId })}
            />
        </View>
    );

    return content;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    card: {
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        ...Shadows.medium,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    requestType: {
        ...Typography.h5,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        ...Typography.caption,
        fontWeight: '600',
    },
    amount: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    description: {
        ...Typography.body,
        marginBottom: Spacing.sm,
    },
    date: {
        ...Typography.caption,
    },
    rejectionContainer: {
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    rejectionLabel: {
        ...Typography.caption,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    rejectionText: {
        ...Typography.caption,
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        paddingVertical: Spacing.lg,
    },
    fab: {
        position: 'absolute',
        right: Spacing.md,
        bottom: Spacing.md,
    },
});
