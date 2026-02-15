const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStores() {
    console.log('Fetching last 3 stores...');
    const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Recent Stores:', JSON.stringify(data, null, 2));
    }
}

checkStores();
