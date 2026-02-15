import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Avatar, List, Switch, Button } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../store/ThemeContext';

export default function HRProfileScreen({ navigation }: any) {
    const { theme, isDark, setMode } = useTheme();
    const [profile, setProfile] = useState<any>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const toggleTheme = () => {
        setMode(isDark ? 'light' : 'dark');
    };

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
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
                <Avatar.Text
                    size={80}
                    label={profile?.full_name?.substring(0, 2).toUpperCase() || 'HR'}
                    style={{ backgroundColor: theme.colors.primary }}
                    labelStyle={{ color: '#FFFFFF' }}
                />
                <Title style={[styles.name, { color: theme.colors.text }]}>{profile?.full_name || 'HR Team Member'}</Title>
                <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{profile?.email}</Text>
                <Text style={[styles.role, { color: theme.colors.primary }]}>HR Team</Text>
            </View>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                    <Title style={{ color: theme.colors.text }}>Settings</Title>
                    <List.Item
                        title="Dark Mode"
                        titleStyle={{ color: theme.colors.text }}
                        description="Toggle app theme"
                        descriptionStyle={{ color: theme.colors.textSecondary }}
                        right={() => (
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                color={theme.colors.primary}
                            />
                        )}
                    />
                    <List.Item
                        title="Notifications"
                        titleStyle={{ color: theme.colors.text }}
                        description="Enable push notifications"
                        descriptionStyle={{ color: theme.colors.textSecondary }}
                        right={() => (
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                color={theme.colors.primary}
                            />
                        )}
                    />
                    <List.Item
                        title="Language"
                        titleStyle={{ color: theme.colors.text }}
                        description="English"
                        descriptionStyle={{ color: theme.colors.textSecondary }}
                        right={() => <Text style={{ color: theme.colors.textSecondary }}>›</Text>}
                        onPress={() => { }}
                    />
                    <List.Item
                        title="Privacy Policy"
                        titleStyle={{ color: theme.colors.text }}
                        right={() => <Text style={{ color: theme.colors.textSecondary }}>›</Text>}
                        onPress={() => navigation.navigate('Privacy')}
                    />
                </Card.Content>
            </Card>

            <Button
                mode="contained"
                onPress={handleSignOut}
                style={styles.signOutButton}
                buttonColor={theme.colors.error}
                textColor="#FFFFFF"
            >
                Sign Out
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        padding: 30,
    },
    name: {
        marginTop: 15,
        fontSize: 24,
    },
    email: {
        marginTop: 5,
    },
    role: {
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
