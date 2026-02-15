import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import ar from './ar.json';
import en from './en.json';

// Get locale safely for web and mobile
const getLocale = () => {
    if (Platform.OS === 'web') {
        // For web, use browser language
        return navigator.language || 'ar';
    } else {
        // For mobile, use expo-localization
        const Localization = require('expo-localization');
        return Localization.locale || 'ar';
    }
};

const locale = getLocale();

i18n
    .use(initReactI18next)
    .init({
        resources: {
            ar: { translation: ar },
            en: { translation: en },
        },
        lng: locale.startsWith('ar') ? 'ar' : 'en', // Default to Arabic for ar locales, English otherwise
        fallbackLng: 'ar',
        interpolation: {
            escapeValue: false,
        },
        compatibilityJSON: 'v3',
        react: {
            useSuspense: false, // Important for web compatibility
        },
    });

export default i18n;
