/**
 * Mawared App - Automated Test User Setup
 * 
 * This script creates test users in Supabase with proper profiles
 * Run with: node setup-users.js
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

// Test users configuration
const TEST_USERS = [
    {
        email: 'employee@mawared.com',
        password: 'Employee123!',
        full_name: 'Ahmed Al-Saudi',
        phone: '+966501234567',
        role: 'employee'
    },
    {
        email: 'owner@mawared.com',
        password: 'Owner123!',
        full_name: 'Fatima Al-Rashid',
        phone: '+966509876543',
        role: 'store_owner'
    }
];

async function setupDatabase(supabase) {
    console.log('📊 Setting up database tables...\n');

    const createTablesSQL = `
    -- Create profiles table
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID REFERENCES auth.users(id) PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      phone TEXT,
      role TEXT NOT NULL CHECK (role IN ('employee', 'store_owner')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable Row Level Security
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

    -- Create policies
    CREATE POLICY "Users can view own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
        if (error) {
            console.log('⚠️  Note: You may need to create tables manually in Supabase SQL Editor');
            console.log('   See setup-test-users.sql for the schema\n');
        } else {
            console.log('✅ Database tables created successfully\n');
        }
    } catch (err) {
        console.log('⚠️  Note: RPC function not available. Create tables manually in SQL Editor\n');
    }
}

async function createTestUsers(supabase) {
    console.log('👥 Creating test users...\n');

    for (const user of TEST_USERS) {
        try {
            // Sign up the user
            console.log(`Creating ${user.role}: ${user.email}`);

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: user.email,
                password: user.password,
                options: {
                    data: {
                        full_name: user.full_name,
                        phone: user.phone,
                        role: user.role
                    }
                }
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    console.log(`   ℹ️  User already exists: ${user.email}`);
                    continue;
                }
                throw signUpError;
            }

            if (authData.user) {
                console.log(`   ✅ Created user: ${user.email}`);
                console.log(`   📝 User ID: ${authData.user.id}`);

                // Insert profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: authData.user.id,
                        email: user.email,
                        full_name: user.full_name,
                        phone: user.phone,
                        role: user.role
                    });

                if (profileError) {
                    console.log(`   ⚠️  Profile creation failed: ${profileError.message}`);
                    console.log(`   💡 You may need to create the profile manually`);
                } else {
                    console.log(`   ✅ Profile created successfully`);
                }
            }

            console.log('');
        } catch (error) {
            console.error(`   ❌ Error creating ${user.email}:`, error.message);
            console.log('');
        }
    }
}

async function main() {
    console.log('🚀 Mawared App - Test User Setup\n');
    console.log('=================================\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Setup database
    await setupDatabase(supabase);

    // Create test users
    await createTestUsers(supabase);

    console.log('=================================\n');
    console.log('✅ Setup Complete!\n');
    console.log('📋 Test Credentials:\n');
    console.log('Employee Account:');
    console.log('  Email: employee@mawared.com');
    console.log('  Password: Employee123!\n');
    console.log('Store Owner Account:');
    console.log('  Email: owner@mawared.com');
    console.log('  Password: Owner123!\n');
    console.log('🌐 Test at: http://localhost:8081\n');
}

main().catch(console.error);
