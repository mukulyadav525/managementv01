import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testInsert() {
    console.log("Testing insert into users table with service key (bypasses RLS) to check FK constraint...");
    const { data, error } = await supabase.from('users').insert([
        {
            uid: '123e4567-e89b-12d3-a456-426614174000', // Random UUID
            email: 'dummy_staff@test.com',
            name: 'Dummy Staff',
            role: 'staff',
            staff_type: 'domestic_staff',
            society_id: 'TestSociety'
        }
    ]);

    if (error) {
        console.error("Insert Failed:", error.message, error.code, error.details);
    } else {
        console.log("Insert Succeeded! No FK constraint blocking or it's deferred.");

        // Clean up
        await supabase.from('users').delete().eq('uid', '123e4567-e89b-12d3-a456-426614174000');
    }
}

testInsert();
