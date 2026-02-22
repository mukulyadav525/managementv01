import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.log("No service key found, trying to query pg_policies via RPC or fallback...");
}

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function checkPolicies() {
    // If we have a service key, we can run raw sql via an RPC if one exists,
    // or just fetch all policies if exposed.
    // Let's check `pg_policies` if accessible via REST API (unlikely for anon).
    const { data, error } = await supabase
        .from('pg_policies') // This might fail if anon, but worth a shot if we have service key or it's public
        .select('*')
        .eq('tablename', 'visitors');

    if (error) {
        console.error("Could not fetch pg_policies:", error.message);
    } else {
        console.log("Active Policies for visitors table:", JSON.stringify(data, null, 2));
    }
}

checkPolicies();
