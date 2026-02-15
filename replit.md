# Mawared App

## Overview
Mawared is a React Native / Expo employee management application with web support. It uses Supabase as the backend service for authentication and data management. The app supports multiple user roles: employees, HR team, store owners, and super admins.

## Recent Changes
- 2026-02-15: Initial import and Replit environment setup

## Project Architecture

### Tech Stack
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Backend**: Supabase (hosted)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **UI Library**: React Native Paper
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack React Query
- **Internationalization**: i18next (English & Arabic)

### Project Structure
```
/
├── App.tsx                  # Main app entry
├── index.ts                 # Root component registration
├── app.json                 # Expo configuration
├── src/
│   ├── components/          # Reusable UI components
│   ├── constants/           # Theme and app constants
│   ├── locales/             # i18n translation files (en, ar)
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # App screens organized by role
│   │   ├── auth/            # Login, Register, Forgot Password
│   │   ├── employee/        # Employee-specific screens
│   │   ├── hr-team/         # HR team screens
│   │   ├── store-owner/     # Store owner screens
│   │   └── super-admin/     # Super admin screens
│   ├── services/            # API services (Supabase client)
│   ├── store/               # State management (ThemeContext)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper utilities
├── supabase/
│   └── migrations/          # Database migration SQL files
└── assets/                  # App icons and splash screen
```

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `EXPO_PUBLIC_ENV` - Environment (development/production)

### Running the App
- **Development**: `npx expo start --web --port 5000`
- **Deployment**: Static export via `npx expo export --platform web`, served from `dist/`

## User Preferences
- No specific preferences recorded yet
