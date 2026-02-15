const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumns() {
    console.log('Checking columns for employees table...');

    // We can't query information_schema easily via PostgREST without a custom function,
    // but we can try to select a single row and see what we get.
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error selecting from employees:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found in first row:', Object.keys(data[0]));
    } else {
        console.log('Employees table is empty. Trying to describe it by forcing an error...');
        const { error: error2 } = await supabase
            .from('employees')
            .select('non_existent_column_for_test');

        console.log('Error message from invalid select (might show schema info):', error2.message);
    }
}

checkColumns();
