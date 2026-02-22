import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.log("No service key found. Need service key to bypass RLS and execute RPC. Ensure .env has SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function deployFix() {
    const p1 = `DROP POLICY IF EXISTS "Visitors Update" ON public.visitors;`;
    const p2 = `DROP POLICY IF EXISTS "Residents can update visitors for their flats" ON public.visitors;`;
    const p3 = `DROP POLICY IF EXISTS "Allow admin update visitor" ON public.visitors;`;
    const p4 = `DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;`;

    const p5 = `
        CREATE POLICY "Visitors Update" ON public.visitors
        FOR UPDATE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.uid = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
            AND users.society_id = visitors.society_id
          )
          OR
          EXISTS (
            SELECT 1 FROM public.flats 
            WHERE flats.id = (SELECT flat_id FROM public.visitors v2 WHERE v2.id = visitors.id)
            AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.uid = auth.uid() 
            AND (users.role = 'admin' OR users.role = 'staff' OR users.role = 'security')
            AND users.society_id = visitors.society_id
          )
          OR
          EXISTS (
            SELECT 1 FROM public.flats 
            WHERE flats.id = visitors.flat_id 
            AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
          )
        );
    `;

    console.log("Since Supabase JS doesn't support raw SQL execution without an RPC, checking if handle_rls_deploy or similar exists...");

    // Most supabase setups don't have exec_sql unless explicitly added.
    // If we can't run this via JS, we'll recommend the user run the SQL via the Supabase Dashboard.
    console.log("Please run the contents of supabase/migrations/202602221900_fix_visitor_approval.sql in your Supabase SQL Editor.");
}

deployFix();
