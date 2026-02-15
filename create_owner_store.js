const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createStore() {
    const ownerId = 'a0d5c7a9-5538-479c-837f-886780cc6605';
    console.log('Creating store for owner:', ownerId);

    const { data, error } = await supabase
        .from('stores')
        .insert({
            owner_id: ownerId,
            store_name: 'Main Store',
            store_number: 'STR' + Math.floor(Math.random() * 1000),
            location: 'Riyadh',
            status: 'active'
        })
        .select();

    if (error) {
        console.error('Error creating store:', error.message);
    } else {
        console.log('Store created successfully:', data);
    }
}

createStore();
