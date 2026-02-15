import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TestApp() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>✅ Mawared App is Loading!</Text>
            <Text style={styles.subtitle}>If you see this, React is working</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a7f64',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
});
