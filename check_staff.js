import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkStaff() {
    console.log("Fetching staff users...");
    const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'staff');

    if (staffError) {
        console.error("Fetch Error:", staffError);
    } else {
        console.log(`Found ${staffData.length} staff users:`);
        staffData.forEach(s => {
            console.log(`- ${s.name} | society: ${s.society_id} | flat_ids: ${JSON.stringify(s.flat_ids)}`);
        });
    }
}

checkStaff();
