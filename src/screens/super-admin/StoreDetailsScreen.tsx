import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, Divider } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';
import { supabase } from '../../services/supabase';

export default function StoreDetailsScreen({ route, navigation }: any) {
    const { storeId } = route.params;
    const { theme } = useTheme();
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoreDetails();
    }, [storeId]);

    const loadStoreDetails = async () => {
        setLoading(true);
        try {
            console.log(`Loading store details for ${storeId} via admin API...`);
            const result = await adminApi.getStoreDetails(storeId);
            if (result.success && result.store) {
                setStore(result.store);
            } else {
                console.error('Store not found in API response');
            }
        } catch (error) {
            console.error('Error loading store details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!store) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>Store not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Title style={styles.headerTitle}>{store.store_name}</Title>
                    <Text style={styles.headerSubtitle}>{store.store_number}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.navigate('EditStore', { storeId, initialData: store })}
                    style={styles.editButton}
                >
                    <Ionicons name="create-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="information" size={24} color={theme.colors.primary} />
                            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>General Information</Title>
                        </View>
                        <Divider style={styles.divider} />

                        <List.Item
                            title="Status"
                            description={store.status.toUpperCase()}
                            left={props => <List.Icon {...props} icon="toggle-switch" color={store.status === 'active' ? '#10B981' : '#EF4444'} />}
                        />
                        <List.Item
                            title="Phone"
                            description={store.phone || 'Not provided'}
                            left={props => <List.Icon {...props} icon="phone" color={theme.colors.primary} />}
                        />
                        <List.Item
                            title="Created At"
                            description={new Date(store.created_at).toLocaleDateString()}
                            left={props => <List.Icon {...props} icon="calendar" color={theme.colors.primary} />}
                        />
                    </Card.Content>
                </Card>

                <Card style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 16 }]}>
                    <Card.Content>
                        <View style={styles.sectionHeader}>
                            <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary} />
                            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Owner Details</Title>
                        </View>
                        <Divider style={styles.divider} />

                        {store.owner_profile ? (
                            <>
                                <List.Item
                                    title="Full Name"
                                    description={store.owner_profile.full_name}
                                    left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
                                />
                                <List.Item
                                    title="Email"
                                    description={store.owner_profile.email}
                                    left={props => <List.Icon {...props} icon="email" color={theme.colors.primary} />}
                                />
                                <List.Item
                                    title="Contact Phone"
                                    description={store.owner_profile.phone || 'N/A'}
                                    left={props => <List.Icon {...props} icon="phone-outline" color={theme.colors.primary} />}
                                />
                            </>
                        ) : (
                            <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>No owner assigned</Text>
                        )}
                    </Card.Content>
                </Card>

                <Button
                    mode="contained"
                    onPress={() => navigation.goBack()}
                    style={styles.backButtonBottom}
                    buttonColor={theme.colors.primary}
                >
                    Back to List
                </Button>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        paddingTop: 40,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
    },
    editButton: {
        padding: 5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        marginLeft: 10,
        fontSize: 18,
    },
    divider: {
        marginVertical: 8,
    },
    backButtonBottom: {
        marginTop: 24,
        borderRadius: 8,
    }
});
