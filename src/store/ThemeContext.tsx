import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: typeof LightTheme;
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        loadMode();
    }, []);

    const loadMode = async () => {
        try {
            const savedMode = await AsyncStorage.getItem('themeMode');
            if (savedMode) {
                setModeState(savedMode as ThemeMode);
            }
        } catch (error) {
            console.error('Error loading theme mode:', error);
        }
    };

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await AsyncStorage.setItem('themeMode', newMode);
        } catch (error) {
            console.error('Error saving theme mode:', error);
        }
    };

    const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
    const theme = isDark ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
