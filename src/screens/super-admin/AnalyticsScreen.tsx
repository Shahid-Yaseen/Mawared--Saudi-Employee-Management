import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Title } from 'react-native-paper';
import { Colors } from '../../constants/theme';

export default function AnalyticsScreen() {
    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Title>Platform Analytics</Title>
                    <Text style={styles.placeholder}>
                        Analytics charts and metrics will be displayed here
                    </Text>
                    <View style={styles.metricRow}>
                        <View style={styles.metric}>
                            <Text style={styles.metricValue}>1,234</Text>
                            <Text style={styles.metricLabel}>Total Users</Text>
                        </View>
                        <View style={styles.metric}>
                            <Text style={styles.metricValue}>567</Text>
                            <Text style={styles.metricLabel}>Active Stores</Text>
                        </View>
                    </View>
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
    placeholder: {
        textAlign: 'center',
        color: Colors.textSecondary,
        marginVertical: 20,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    metric: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    metricLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 5,
    },
});
