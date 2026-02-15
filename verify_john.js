const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser() {
    console.log('Checking for john@example.com...');

    // We can't check auth.users easily without admin key, 
    // but we can check the profiles table which should correspond.
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'john@example.com')
        .single();

    if (error) {
        console.log('Profile search error:', error.message);
    } else if (profile) {
        console.log('Found profile:', profile);
    } else {
        console.log('No profile found for john@example.com');
    }
}

checkUser();
