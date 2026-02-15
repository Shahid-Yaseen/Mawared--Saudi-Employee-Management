# Mawared - Employee Affairs Management Platform

![Mawared Logo](./assets/icon.png)

A comprehensive employee affairs management platform designed specifically for small to medium-sized businesses in Saudi Arabia. Built with React Native (Expo) for cross-platform support (iOS, Android, Web) and Supabase for the backend.

## 🎯 Overview

Mawared simplifies employee management for Saudi businesses by providing:

- ✅ **GPS-Based Attendance** - Geofencing technology ensures employees are on-site
- ✅ **Leave Management** - Saudi labor law compliant leave types and tracking
- ✅ **Employee Requests** - Centralized system for all employee requests
- ✅ **Payroll Processing** - Automated salary calculations with GOSI compliance
- ✅ **Real-Time Analytics** - Instant insights into workforce management
- ✅ **Multi-Language** - Full Arabic and English support with RTL

## 🏗️ Tech Stack

### Frontend
- **React Native** (Expo SDK 54)
- **TypeScript** for type safety
- **React Navigation** for routing
- **Zustand** for state management
- **React Query** for server state
- **React Native Paper** for UI components
- **i18next** for localization
- **Expo Location** for GPS/geofencing
- **React Native Maps** for map visualization

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions)
- **PostGIS** for geographic data
- **Row Level Security (RLS)** for multi-tenant isolation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **Supabase Account** (https://supabase.com)
- **Google Maps API Key** (for geofencing)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
cd "/Users/muhammadshahid/Desktop/projects/Mawared- Saudi Employee Management/mawared-app"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key
3. Run the database migrations:
   - Go to **SQL Editor** in Supabase Dashboard
   - Copy and run `supabase/migrations/001_initial_schema.sql`
   - Copy and run `supabase/migrations/002_seed_data.sql`

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
EXPO_PUBLIC_ENV=development
```

### 5. Run the App

#### iOS (Mac only)
```bash
npm run ios
```

#### Android
```bash
npm run android
```

#### Web
```bash
npm run web
```

## 📁 Project Structure

```
mawared-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Buttons, Cards, Inputs
│   │   ├── attendance/      # Attendance-specific components
│   │   ├── leave/           # Leave management components
│   │   ├── requests/        # Request components
│   │   └── payroll/         # Payroll components
│   ├── screens/             # Screen components
│   │   ├── auth/            # Login, Register, ForgotPassword
│   │   ├── employee/        # Employee app screens
│   │   ├── store-owner/     # Store owner dashboard screens
│   │   ├── hr-team/         # HR team screens
│   │   └── super-admin/     # Super admin screens
│   ├── navigation/          # Navigation configuration
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   │   └── supabase.ts      # Supabase client configuration
│   ├── store/               # Zustand state stores
│   ├── utils/               # Utility functions
│   │   └── helpers.ts       # Distance calculation, formatting, etc.
│   ├── constants/           # Constants and theme
│   │   └── theme.ts         # Colors, typography, spacing
│   ├── locales/             # i18n translations
│   │   ├── ar.json          # Arabic translations
│   │   ├── en.json          # English translations
│   │   └── i18n.ts          # i18n configuration
│   └── types/               # TypeScript type definitions
│       └── index.ts         # All type definitions
├── supabase/
│   ├── migrations/          # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   └── 002_seed_data.sql
│   └── functions/           # Edge Functions (to be added)
├── assets/                  # Images, fonts, etc.
├── App.tsx                  # Main app entry point
├── app.json                 # Expo configuration
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
└── .env                     # Environment variables (create from .env.example)
```

## 🔑 Key Features

### 1. GPS-Based Attendance System
- Geofencing with configurable radius (50-500m)
- Device ID enforcement (one device per employee)
- 14-day cooldown for device changes
- Offline queue for failed submissions
- Real-time location validation

### 2. Leave Management
- **Saudi Labor Law Compliant Leave Types:**
  - Annual Leave: 21 days/year (30 after 5 years)
  - Sick Leave: 30 days full pay, 60 half pay
  - Emergency Leave: 5 days/year
  - Hajj Leave: 10 days (unpaid)
  - Maternity Leave: 10 weeks
  - Paternity Leave: 3 days
  - Bereavement Leave: 5 days
  - Marriage Leave: 5 days
- Automatic leave accrual (monthly)
- Leave balance tracking
- Multi-level approval workflow
- Leave calendar visualization

### 3. Employee Request System
- Salary certificates (auto-generated)
- Experience letters
- Housing allowance requests
- Loan requests
- Bonus requests
- Advance salary requests
- Configurable approval routes

### 4. Payroll Processing
- Automated monthly payroll calculation
- Attendance integration
- Overtime calculation (1.5x rate)
- GOSI deduction (10%)
- Late arrival deductions
- Unpaid leave deductions
- PDF payslip generation

### 5. Multi-Role Support
- **Employee:** Clock in/out, request leave, view payslips
- **Store Owner:** Manage employees, approve requests, generate reports
- **HR Team:** Multi-store management, HR consultations
- **Super Admin:** Platform administration, subscription management

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure token-based auth
- **Device Enforcement** - Prevent time theft
- **Geofence Validation** - Ensure on-site attendance
- **Data Encryption** - Sensitive data encrypted at rest
- **Audit Logging** - Track all critical actions

## 🌍 Localization

The app supports both Arabic and English with full RTL (Right-to-Left) support for Arabic.

To change language:
1. Go to Profile → Settings
2. Select Language (Arabic/English)
3. App will restart with the new language

## 📊 Database Schema

The database consists of the following main tables:

- `profiles` - User profiles
- `stores` - Store/business information
- `employees` - Employee records
- `attendance_records` - Clock in/out records
- `leave_types` - Leave type definitions
- `leave_balances` - Employee leave balances
- `leave_requests` - Leave requests
- `request_types` - Request type definitions
- `employee_requests` - Employee requests
- `payroll_records` - Monthly payroll records
- `subscription_plans` - Subscription plans
- `hr_team_assignments` - HR team assignments
- `support_tickets` - Support tickets
- `audit_logs` - Audit trail

See `supabase/migrations/001_initial_schema.sql` for the complete schema.

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Run E2E Tests
```bash
npm run test:e2e
```

## 📱 Building for Production

### iOS
```bash
eas build --platform ios --profile production
```

### Android
```bash
eas build --platform android --profile production
```

### Web
```bash
npm run build:web
```

## 🤝 Contributing

This is a private project for Saudi businesses. For feature requests or bug reports, please contact the development team.

## 📄 License

Copyright © 2026 Mawared. All rights reserved.

## 📞 Support

For support, please contact:
- Email: support@mawared.sa
- Phone: +966 XX XXX XXXX

## 🗺️ Roadmap

### Phase 1 (Current) - MVP
- [x] Project setup and infrastructure
- [x] Database schema and migrations
- [x] Type definitions
- [x] Localization (Arabic/English)
- [x] Utility functions
- [ ] Authentication screens
- [ ] GPS-based attendance
- [ ] Leave management
- [ ] Employee requests
- [ ] Payroll processing

### Phase 2 - Enhancement
- [ ] Advanced analytics
- [ ] Shift management
- [ ] Biometric attendance
- [ ] Integration with accounting software
- [ ] Mobile app optimization

### Phase 3 - Scale
- [ ] Multi-branch support
- [ ] API for third-party integrations
- [ ] White-label solution
- [ ] Enterprise features

---

**Built with ❤️ for Saudi businesses**
