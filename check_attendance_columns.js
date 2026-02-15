const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAttendanceColumns() {
    console.log('Checking columns for attendance table...');

    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error selecting from attendance:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns found in first row:', Object.keys(data[0]));
    } else {
        console.log('Attendance table is empty. Trying to describe it by forcing an error...');
        const { error: error2 } = await supabase
            .from('attendance')
            .select('non_existent_column_for_test');

        console.log('Error message from invalid select:', error2.message);
    }
}

checkAttendanceColumns();
