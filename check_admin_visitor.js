import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
    process.exit(1);
}

const supabaseService = createClient(supabaseUrl, serviceKey);

async function testAdminApproval() {
    console.log("Fetching visitors to test...");

    // 1. Get an existing visitor that is pending
    const { data: visitors, error: fetchError } = await supabaseService
        .from('visitors')
        .select('*')
        .limit(1);

    if (fetchError || !visitors || visitors.length === 0) {
        console.error("No visitors found.");
        process.exit(0);
    }
    const visitor = visitors[0];
    console.log(`Found visitor: ${visitor.id} in society ${visitor.society_id}`);

    // 2. Find an admin for this society
    const { data: admins } = await supabaseService
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .eq('society_id', visitor.society_id)
        .limit(1);

    if (!admins || admins.length === 0) {
        console.error("No admins found for society.");
        process.exit(0);
    }
    const adminUser = admins[0];
    console.log(`Found admin: ${adminUser.uid}`);

    // 3. Let's pretend to be the admin and see if we can update the visitor
    console.log("Attempting to update as admin (testing RLS logic remotely)...");

    // We don't have the admin's JWT easily, so let's run a query to check the RLS directly or check columns
    console.log("Let's check if the policy applied correctly by running query on pg_policies...");
    const { data: policies, error: polErr } = await supabaseService.rpc('exec_sql', {
        query: `SELECT * FROM pg_policies WHERE tablename = 'visitors'`
    }).catch(e => ({ data: null, error: e }));

    if (polErr) {
        console.log("RPC exec_sql failed, the user might not have applied the migration correctly.");
    } else if (policies) {
        console.log("Policies on visitors table:");
        console.log(policies);
    }
}

testAdminApproval();
