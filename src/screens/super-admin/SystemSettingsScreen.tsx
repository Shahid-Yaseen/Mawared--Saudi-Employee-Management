import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, List, Switch } from 'react-native-paper';
import { Colors } from '../../constants/theme';

export default function SystemSettingsScreen() {
    const [emailNotifications, setEmailNotifications] = React.useState(true);
    const [maintenanceMode, setMaintenanceMode] = React.useState(false);

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Title>System Configuration</Title>
                    <List.Item
                        title="Email Notifications"
                        description="Enable system-wide email notifications"
                        right={() => (
                            <Switch
                                value={emailNotifications}
                                onValueChange={setEmailNotifications}
                            />
                        )}
                    />
                    <List.Item
                        title="Maintenance Mode"
                        description="Put system in maintenance mode"
                        right={() => (
                            <Switch
                                value={maintenanceMode}
                                onValueChange={setMaintenanceMode}
                            />
                        )}
                    />
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Content>
                    <Title>Platform Settings</Title>
                    <List.Item
                        title="Default Geofence Radius"
                        description="100 meters"
                        right={() => <Text>›</Text>}
                    />
                    <List.Item
                        title="Leave Accrual Settings"
                        description="Configure leave accrual rules"
                        right={() => <Text>›</Text>}
                    />
                    <List.Item
                        title="Payroll Settings"
                        description="Configure payroll calculations"
                        right={() => <Text>›</Text>}
                    />
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
});
