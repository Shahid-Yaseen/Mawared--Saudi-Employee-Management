const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStoresTable() {
    console.log('Checking if stores table exists...');

    const { error } = await supabase
        .from('stores')
        .select('id')
        .limit(1);

    if (error) {
        console.log('Stores table issue:', error.message);
    } else {
        console.log('Stores table exists.');
    }
}

checkStoresTable();
