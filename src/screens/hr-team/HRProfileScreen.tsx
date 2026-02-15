import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Avatar, List, Switch, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

export default function HRProfileScreen({ navigation }: any) {
    const [profile, setProfile] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            setProfile(data);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigation.replace('Login');
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text
                    size={80}
                    label={profile?.full_name?.substring(0, 2).toUpperCase() || 'HR'}
                    style={{ backgroundColor: Colors.primary }}
                />
                <Title style={styles.name}>{profile?.full_name || 'HR Team Member'}</Title>
                <Text style={styles.email}>{profile?.email}</Text>
                <Text style={styles.role}>HR Team</Text>
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <Title>Settings</Title>
                    <List.Item
                        title="Notifications"
                        description="Enable push notifications"
                        right={() => (
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                            />
                        )}
                    />
                    <List.Item
                        title="Language"
                        description="English"
                        right={() => <Text>›</Text>}
                        onPress={() => { }}
                    />
                    <List.Item
                        title="Privacy Policy"
                        right={() => <Text>›</Text>}
                        onPress={() => navigation.navigate('Privacy')}
                    />
                </Card.Content>
            </Card>

            <Button
                mode="contained"
                onPress={handleSignOut}
                style={styles.signOutButton}
                buttonColor={Colors.error}
            >
                Sign Out
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: '#fff',
    },
    name: {
        marginTop: 15,
        fontSize: 24,
    },
    email: {
        color: Colors.textSecondary,
        marginTop: 5,
    },
    role: {
        color: Colors.primary,
        marginTop: 5,
        fontWeight: '600',
    },
    card: {
        margin: 10,
        elevation: 2,
    },
    signOutButton: {
        margin: 20,
    },
});
