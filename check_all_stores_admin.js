const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStoresAdmin() {
    console.log('Fetching all stores via Service Role...');
    const { data, error } = await supabase
        .from('stores')
        .select('*');

    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Total Stores found:', data.length);
        console.log('Stores:', JSON.stringify(data, null, 2));
    }
}

checkStoresAdmin();
