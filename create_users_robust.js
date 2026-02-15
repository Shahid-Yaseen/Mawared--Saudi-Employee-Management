
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createUsersRobust() {
    console.log('--- Creating Users Robustly ---');

    const users = [
        { email: 'final_emp@mawared.com', password: 'Employee123!', fullName: 'Final Employee', role: 'employee' },
        { email: 'final_hr@mawared.com', password: 'HRStaff123!', fullName: 'Final HR', role: 'hr' }
    ];

    for (const user of users) {
        console.log(`Creating ${user.email}...`);
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    full_name: user.fullName,
                    role: user.role
                }
            }
        });

        if (error) {
            console.error(`Error creating ${user.email}:`, error.message);
        } else {
            console.log(`Success: ${user.email} created.`);
            if (data.user) {
                // Manually insert into profiles as well
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        email: user.email,
                        full_name: user.fullName,
                        role: user.role
                    });
                if (profileError) console.error(`Profile error for ${user.email}:`, profileError.message);
                else console.log(`Profile updated for ${user.email}`);
            }
        }
        await delay(10000); // 10 second delay
    }
}

createUsersRobust();
