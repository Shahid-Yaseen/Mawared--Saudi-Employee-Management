const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPolicies() {
    console.log('Fetching policies is not possible via standard API.');
    console.log('However, I will check if I can insert into profiles as an authenticated user if I had a token.');
    console.log('Instead, I will check the current owner profile again.');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'owner@mawared.com')
        .single();

    console.log('Owner Profile:', profile);
}

checkPolicies();
