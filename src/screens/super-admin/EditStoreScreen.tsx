import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Card, TextInput, Button, Title } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/ThemeContext';
import { adminApi } from '../../services/adminApi';

export default function EditStoreScreen({ route, navigation }: any) {
    const { storeId, initialData } = route.params;
    const { theme } = useTheme();

    const [storeName, setStoreName] = useState(initialData?.store_name || '');
    const [storeNumber, setStoreNumber] = useState(initialData?.store_number || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!initialData);

    useEffect(() => {
        if (!initialData) {
            loadStoreDetails();
        }
    }, [storeId]);

    const loadStoreDetails = async () => {
        setFetching(true);
        try {
            const result = await adminApi.getStoreDetails(storeId);
            if (result.success && result.store) {
                setStoreName(result.store.store_name);
                setStoreNumber(result.store.store_number);
                setPhone(result.store.phone || '');
            }
        } catch (error) {
            console.error('Error loading store:', error);
            Alert.alert('Error', 'Failed to load store details');
        } finally {
            setFetching(false);
        }
    };

    const handleUpdate = async () => {
        if (!storeName.trim()) {
            Alert.alert('Validation Error', 'Store name is required');
            return;
        }

        setLoading(true);
        try {
            await adminApi.updateStore({
                storeId,
                storeName: storeName.trim(),
                storeNumber: storeNumber.trim(),
                phone: phone.trim() || undefined,
            });

            const successMsg = 'Store updated successfully';
            if (Platform.OS === 'web') {
                alert(successMsg);
                navigation.goBack();
            } else {
                Alert.alert('Success', successMsg, [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update store');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Title style={styles.headerTitle}>Edit Store</Title>
            </View>

            <View style={styles.content}>
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Card.Content>
                        <TextInput
                            label="Store Name"
                            value={storeName}
                            onChangeText={setStoreName}
                            mode="outlined"
                            style={styles.input}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                        />

                        <TextInput
                            label="Store Number"
                            value={storeNumber}
                            onChangeText={setStoreNumber}
                            mode="outlined"
                            style={styles.input}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                        />

                        <TextInput
                            label="Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            mode="outlined"
                            style={styles.input}
                            keyboardType="phone-pad"
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                            textColor={theme.colors.text}
                        />

                        <Button
                            mode="contained"
                            onPress={handleUpdate}
                            style={styles.button}
                            buttonColor={theme.colors.primary}
                            loading={loading}
                            disabled={loading}
                        >
                            Save Changes
                        </Button>
                    </Card.Content>
                </Card>
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
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 16,
    },
    card: {
        borderRadius: 12,
        elevation: 4,
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
        borderRadius: 8,
        paddingVertical: 4,
    },
});
