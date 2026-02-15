# Mawared App

## Overview
Mawared is a React Native / Expo employee management application with web support. It uses Supabase as the backend service for authentication and data management. The app supports multiple user roles: employees, HR team, store owners, and super admins.

## Recent Changes
- 2026-02-15: Implemented complete Super Admin functionality
  - Express backend server on port 5000 proxying to Expo Metro on 8081
  - Admin API routes for user creation, Brevo email integration, role management
  - AddStoreOwner screen with form + Brevo welcome email with temp password
  - ForceChangePassword screen intercepting login for users with must_change_password flag
  - Enhanced AdminDashboard with real-time stats and recent activity
  - Enhanced UserManagement with role filtering, role change, password reset, activate/deactivate
  - SubscriptionPlans CRUD management screen
  - Analytics dashboard with store status, user distribution, monthly growth
  - SystemSettings with persistence (geofence, leave, payroll, platform settings)
  - Updated navigation with Stack+Tab combo for admin screens
  - Fixed role routing: super_admin, hr_team roles properly handled
- 2026-02-15: Initial import and Replit environment setup

## Project Architecture

### Tech Stack
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Backend**: Supabase (hosted) + Express.js API server
- **Email Service**: Brevo (transactional emails)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **UI Library**: React Native Paper
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack React Query
- **Internationalization**: i18next (English & Arabic)

### Project Structure
```
/
├── App.tsx                  # Main app entry with auth flow + force password change
├── index.ts                 # Root component registration
├── app.json                 # Expo configuration
├── server/
│   └── index.js             # Express API server (port 5000, proxies to Metro 8081)
├── src/
│   ├── components/          # Reusable UI components
│   ├── constants/           # Theme and app constants
│   ├── locales/             # i18n translation files (en, ar)
│   ├── navigation/          # Navigation configuration (Auth, Employee, StoreOwner, HR, SuperAdmin)
│   ├── screens/
│   │   ├── auth/            # Login, Register, Forgot Password, ForceChangePassword
│   │   ├── employee/        # Employee-specific screens
│   │   ├── hr-team/         # HR team screens
│   │   ├── store-owner/     # Store owner screens
│   │   └── super-admin/     # Admin: Dashboard, StoreManagement, UserManagement,
│   │                        #   AddStoreOwner, SubscriptionPlans, Analytics, SystemSettings
│   ├── services/
│   │   ├── supabase.ts      # Supabase client
│   │   └── adminApi.ts      # Admin API service (calls Express backend)
│   ├── store/               # State management (ThemeContext)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper utilities
├── supabase/
│   └── migrations/          # Database migration SQL files
└── assets/                  # App icons and splash screen
```

### Architecture
- **Frontend**: Expo web app served via Metro dev server on port 8081
- **Backend**: Express.js API server on port 5000 that:
  - Proxies all non-API requests to Metro bundler (port 8081)
  - Handles admin operations requiring service role key (user creation, role changes)
  - Sends transactional emails via Brevo API
  - Manages system settings and subscription plans

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `BREVO_API_KEY` - Brevo API key for transactional emails
- `BREVO_SENDER_EMAIL` - Sender email for Brevo (default: noreply@mawared.app)
- `BREVO_SENDER_NAME` - Sender name for Brevo (default: Mawared)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key
- `EXPO_PUBLIC_ENV` - Environment (development/production)

### Running the App
- **Development**: Express server on port 5000 proxying to Metro on 8081
  - `bash -c "npx expo start --web --port 8081 & sleep 5 && node server/index.js"`
- **Deployment**: Static export via `npx expo export --platform web`, served from `dist/`

### Key Flows
1. **Admin creates store owner**: Fill form → Backend creates Supabase user + profile + store → Brevo sends welcome email with temp password
2. **Force password change**: User logs in → App checks `must_change_password` flag → Redirects to change password screen → Updates flag on success
3. **Role-based routing**: App.tsx checks profile.role → Routes to appropriate navigator (Employee, StoreOwner, HR, SuperAdmin)

## User Preferences
- No specific preferences recorded yet
