
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elpbamjdmljaaxzjcatx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscGJhbWpkbWxqYWF4empjYXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODQyNjIsImV4cCI6MjA4NjQ2MDI2Mn0.sSGSOqHf7-SsXAZ3qyIvI9lFcgrklybodo_5T_jWRQU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUsers() {
    console.log('--- Creating Test Users ---');

    const users = [
        { email: 'owner2@mawared.com', password: 'Owner123!', fullName: 'Fatima Al-Rashid', role: 'store_owner' },
        { email: 'employee2@mawared.com', password: 'Employee123!', fullName: 'Ahmed Al-Saudi', role: 'employee' },
        { email: 'hr@mawared.com', password: 'HR123!', fullName: 'Sara Al-Zahrani', role: 'hr' }
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
            console.log(`Success: ${user.email} created/already exists.`);

            // Try to insert into profiles if it doesn't exist
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: data.user.id,
                        email: user.email,
                        full_name: user.fullName,
                        role: user.role
                    });
                if (profileError) {
                    console.error(`Error updating profile for ${user.email}:`, profileError.message);
                } else {
                    console.log(`Profile updated for ${user.email}`);
                }
            }
        }
    }
}

createTestUsers();
