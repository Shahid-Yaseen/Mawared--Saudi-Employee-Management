import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';

// Color Palette
export const Colors = {
    // Primary Colors (Yellowish/Gold - Mawared Saudi Style)
    primary: '#D4AF37', // Metallic Gold
    primaryDark: '#B8860B', // Dark Goldenrod
    primaryLight: '#FFD700', // Gold

    // Secondary Colors (Supporting Palette)
    secondary: '#1A1A1A',
    secondaryDark: '#000000',
    secondaryLight: '#333333',

    // Status Colors
    success: '#10B981', // Emerald
    warning: '#F59E0B', // Amber
    error: '#EF4444', // Red
    info: '#3B82F6', // Blue

    // UI Colors
    background: '#F8F9FA',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#D1D5DB',

    // Static Colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
};

export const LightTheme = {
    ...MD3LightTheme,
    dark: false,
    colors: {
        ...MD3LightTheme.colors,
        ...Colors,
        primary: Colors.primary,
        onPrimary: Colors.white,
        secondary: Colors.secondary,
        onSecondary: Colors.white,
        background: '#F8F9FA',
        surface: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        divider: '#E5E7EB',
        border: '#D1D5DB',
        card: '#FFFFFF',
        sidebar: '#FFFFFF',
        sidebarText: '#4B5563',
        sidebarActive: '#F3F4F6',
        sidebarIcon: '#9CA3AF',
    },
};

export const DarkTheme = {
    ...MD3DarkTheme,
    dark: true,
    colors: {
        ...MD3DarkTheme.colors,
        ...Colors,
        primary: Colors.primary,
        onPrimary: Colors.white,
        secondary: Colors.secondary,
        onSecondary: Colors.white,
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F9FAFB',
        textSecondary: '#9CA3AF',
        divider: '#334155',
        border: '#1E293B',
        card: '#1E293B',
        sidebar: '#1F2937',
        sidebarText: '#9CA3AF',
        sidebarActive: '#334155',
        sidebarIcon: '#64748B',
    },
};

// Typography
export const Typography = {
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        lineHeight: 40,
    },
    h2: {
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 36,
    },
    h3: {
        fontSize: 24,
        fontWeight: '600' as const,
        lineHeight: 32,
    },
    h4: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
    },
    h5: {
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 24,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
    },
    small: {
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
    },
};

// Spacing
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Border Radius
export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
};

// Shadows
export const Shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
};

// Geofence Settings
export const GeofenceSettings = {
    minRadius: 50, // meters
    maxRadius: 500, // meters
    defaultRadius: 100, // meters
    accuracyThreshold: 50, // meters
    tolerance: 10, // meters
};

// Date Formats
export const DateFormats = {
    display: 'dd/MM/yyyy',
    displayWithTime: 'dd/MM/yyyy HH:mm',
    api: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    time: 'HH:mm',
    monthYear: 'MMMM yyyy',
};
