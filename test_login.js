const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log('Testing login for admin@mawared.app...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'admin@mawared.app',
            password: 'Mawared@2026!'
        });

        if (error) {
            console.log('Login failed:', error.message);
        } else {
            console.log('Login successful! User ID:', data.user.id);
        }
    } catch (err) {
        console.log('Exception during login:', err.message);
    }
}

testLogin();
