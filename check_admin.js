const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdmin() {
    console.log('Checking for admin@mawared.app...');
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'admin@mawared.app')
        .single();

    if (error) {
        console.log('Profile error:', error.message);
    } else {
        console.log('Profile found:', profile);
    }
}

checkAdmin();
