const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    process.exit(1);
}

const supabaseService = createClient(supabaseUrl, serviceKey);

async function check() {
    const { data, error } = await supabaseService.from('visitors').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log("Visitor fields:", Object.keys(data[0]));
    }
}
check();
