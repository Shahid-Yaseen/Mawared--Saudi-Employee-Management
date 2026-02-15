
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('--- Checking for Requested Users ---');

    const emails = ['test_emp@mawared.com', 'test_hr@mawared.com'];

    for (const email of emails) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            console.error(`Error checking ${email}:`, error.message);
        } else if (data) {
            console.log(`FOUND: ${email} (Role: ${data.role})`);
        } else {
            console.log(`NOT FOUND: ${email}`);
        }
    }
}

checkUsers();
