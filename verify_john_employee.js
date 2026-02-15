const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkEmployee() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'john@example.com')
        .single();

    if (profile) {
        const { data: employees, error } = await supabase
            .from('employees')
            .select('*')
            .eq('user_id', profile.id);

        console.log('Employees found:', employees ? employees.length : 0);
        if (employees && employees.length > 0) {
            console.log('Employee record:', employees[0]);
        } else {
            console.log('No employee record found.');
        }
    }
}

checkEmployee();
