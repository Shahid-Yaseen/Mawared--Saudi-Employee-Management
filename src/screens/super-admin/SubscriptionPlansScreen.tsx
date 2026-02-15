import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
    ScrollView,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { Card, Button, Chip, FAB, TextInput, Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

export default function SubscriptionPlansScreen({ navigation }: any) {
    const { theme } = useTheme();
    const [plans, setPlans] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [priceMonthly, setPriceMonthly] = useState('');
    const [priceYearly, setPriceYearly] = useState('');
    const [maxEmployees, setMaxEmployees] = useState('');
    const [features, setFeatures] = useState('');
    const [hrConsultationHours, setHrConsultationHours] = useState('');

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price_monthly', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error: any) {
            console.error('Error loading plans:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const resetForm = () => {
        setName('');
        setNameAr('');
        setPriceMonthly('');
        setPriceYearly('');
        setMaxEmployees('');
        setFeatures('');
        setHrConsultationHours('');
        setEditingPlan(null);
    };

    const openAddModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (plan: any) => {
        setEditingPlan(plan);
        setName(plan.name || '');
        setNameAr(plan.name_ar || '');
        setPriceMonthly(String(plan.price_monthly || ''));
        setPriceYearly(String(plan.price_yearly || ''));
        setMaxEmployees(String(plan.max_employees || ''));
        setFeatures(Array.isArray(plan.features) ? plan.features.join(', ') : '');
        setHrConsultationHours(String(plan.hr_consultation_hours || ''));
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Plan name is required');
            return;
        }
        if (!priceMonthly || isNaN(Number(priceMonthly))) {
            Alert.alert('Validation Error', 'Valid monthly price is required');
            return;
        }
        if (!priceYearly || isNaN(Number(priceYearly))) {
            Alert.alert('Validation Error', 'Valid yearly price is required');
            return;
        }
        if (!maxEmployees || isNaN(Number(maxEmployees))) {
            Alert.alert('Validation Error', 'Valid max employees count is required');
            return;
        }

        setSaving(true);
        try {
            const featuresList = features
                .split(',')
                .map((f: string) => f.trim())
                .filter((f: string) => f.length > 0);

            const params = {
                name: name.trim(),
                nameAr: nameAr.trim() || undefined,
                priceMonthly: parseFloat(priceMonthly),
                priceYearly: parseFloat(priceYearly),
                maxEmployees: parseInt(maxEmployees),
                features: featuresList.length > 0 ? featuresList : undefined,
                hrConsultationHours: hrConsultationHours ? parseInt(hrConsultationHours) : undefined,
            };

            if (editingPlan) {
                await adminApi.updateSubscriptionPlan(editingPlan.id, params);
                Alert.alert('Success', 'Subscription plan updated successfully');
            } else {
                await adminApi.createSubscriptionPlan(params);
                Alert.alert('Success', 'Subscription plan created successfully');
            }

            setModalVisible(false);
            resetForm();
            loadPlans();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save subscription plan');
        } finally {
            setSaving(false);
        }
    };

    const togglePlanStatus = async (plan: any) => {
        const newStatus = plan.is_active ? false : true;
        try {
            await adminApi.updateSubscriptionPlan(plan.id, { isActive: newStatus });
            Alert.alert('Success', `Plan ${newStatus ? 'activated' : 'deactivated'} successfully`);
            loadPlans();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update plan status');
        }
    };

    const renderPlan = ({ item }: any) => (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={styles.planInfo}>
                        <Text style={[styles.planName, { color: theme.colors.text }]}>{item.name}</Text>
                        {item.name_ar ? (
                            <Text style={[styles.planNameAr, { color: theme.colors.textSecondary }]}>{item.name_ar}</Text>
                        ) : null}
                    </View>
                    <Chip
                        mode="flat"
                        style={[
                            styles.statusChip,
                            {
                                backgroundColor:
                                    item.is_active !== false ? '#10B98120' : '#EF444420',
                            },
                        ]}
                        textStyle={{
                            color: item.is_active !== false ? '#10B981' : '#EF4444',
                        }}
                    >
                        {item.is_active !== false ? 'Active' : 'Inactive'}
                    </Chip>
                </View>

                <View style={[styles.priceContainer, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.priceItem}>
                        <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Monthly</Text>
                        <Text style={[styles.priceValue, { color: theme.colors.primary }]}>{item.price_monthly} SAR</Text>
                    </View>
                    <View style={[styles.priceDivider, { backgroundColor: theme.colors.divider }]} />
                    <View style={styles.priceItem}>
                        <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Yearly</Text>
                        <Text style={[styles.priceValue, { color: theme.colors.primary }]}>{item.price_yearly} SAR</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>Max Employees: {item.max_employees}</Text>
                </View>

                {item.hr_consultation_hours ? (
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>HR Consultation: {item.hr_consultation_hours} hrs</Text>
                    </View>
                ) : null}

                {Array.isArray(item.features) && item.features.length > 0 ? (
                    <View style={styles.featuresContainer}>
                        <Text style={[styles.featuresTitle, { color: theme.colors.text }]}>Features:</Text>
                        <View style={styles.featuresList}>
                            {item.features.map((feature: string, index: number) => (
                                <View key={index} style={styles.featureItem}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                    <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>{feature}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                <View style={styles.actions}>
                    <Button
                        mode="outlined"
                        onPress={() => togglePlanStatus(item)}
                        style={[styles.actionButton, { borderColor: theme.colors.outline }]}
                        labelStyle={{ color: theme.colors.primary }}
                    >
                        {item.is_active !== false ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => openEditModal(item)}
                        style={styles.actionButton}
                        buttonColor={theme.colors.primary}
                        textColor="white"
                    >
                        Edit
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <FlatList
                data={plans}
                renderItem={renderPlan}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={loadPlans}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="card-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No subscription plans found</Text>
                    </View>
                }
            />

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={openAddModal}
                color="white"
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        <ScrollView>
                            <View style={styles.modalHeader}>
                                <Title style={[styles.modalTitle, { color: theme.colors.text }]}>
                                    {editingPlan ? 'Edit Plan' : 'Add New Plan'}
                                </Title>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                label="Plan Name *"
                                value={name}
                                onChangeText={setName}
                                mode="outlined"
                                style={styles.modalInput}
                            />

                            <TextInput
                                label="Plan Name (Arabic)"
                                value={nameAr}
                                onChangeText={setNameAr}
                                mode="outlined"
                                style={styles.modalInput}
                            />

                            <View style={styles.row}>
                                <TextInput
                                    label="Monthly Price *"
                                    value={priceMonthly}
                                    onChangeText={setPriceMonthly}
                                    mode="outlined"
                                    style={[styles.modalInput, styles.halfInput]}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    label="Yearly Price *"
                                    value={priceYearly}
                                    onChangeText={setPriceYearly}
                                    mode="outlined"
                                    style={[styles.modalInput, styles.halfInput]}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TextInput
                                label="Max Employees *"
                                value={maxEmployees}
                                onChangeText={setMaxEmployees}
                                mode="outlined"
                                style={styles.modalInput}
                                keyboardType="numeric"
                            />

                            <TextInput
                                label="Features (comma-separated)"
                                value={features}
                                onChangeText={setFeatures}
                                mode="outlined"
                                style={styles.modalInput}
                                multiline
                                numberOfLines={3}
                            />

                            <TextInput
                                label="HR Consultation Hours"
                                value={hrConsultationHours}
                                onChangeText={setHrConsultationHours}
                                mode="outlined"
                                style={styles.modalInput}
                                keyboardType="numeric"
                            />

                            <View style={styles.modalActions}>
                                <Button
                                    mode="outlined"
                                    onPress={() => setModalVisible(false)}
                                    style={[styles.modalButton, { borderColor: theme.colors.outline }]}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={handleSave}
                                    style={styles.modalButton}
                                    buttonColor={theme.colors.primary}
                                    textColor="white"
                                    loading={saving}
                                    disabled={saving}
                                >
                                    {editingPlan ? 'Update' : 'Create'}
                                </Button>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 10,
    },
    card: {
        marginBottom: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    planNameAr: {
        fontSize: 14,
        marginTop: 2,
    },
    statusChip: {
        height: 28,
    },
    priceContainer: {
        flexDirection: 'row',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },
    priceItem: {
        flex: 1,
        alignItems: 'center',
    },
    priceDivider: {
        width: 1,
    },
    priceLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 13,
        marginLeft: 8,
    },
    featuresContainer: {
        marginTop: 8,
        marginBottom: 4,
    },
    featuresTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    featuresList: {
        marginLeft: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    featureText: {
        fontSize: 13,
        marginLeft: 6,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 12,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 4,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 12,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalInput: {
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 16,
    },
    modalButton: {
        flex: 1,
        marginHorizontal: 4,
    },
});
