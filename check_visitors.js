import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key if available, otherwise we use anon and just try to get column info
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVisitorsTable() {
    // We can just insert a dummy record and see what error we get, 
    // or we can query the information_schema via RPC if one exists.
    // Let's try to update a non-existent visitor with the fields we use

    console.log("Attempting a dummy update to check for column existence...");
    const { error } = await supabase
        .from('visitors')
        .update({
            status: 'approved',
            approved_by: '00000000-0000-0000-0000-000000000000'
        })
        .eq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
        console.error("Update Error:", error.message, error.code, error.details);
    } else {
        console.log("Update query succeeded (0 rows updated). Columns 'status' and 'approved_by' exist.");
    }
}

checkVisitorsTable();
