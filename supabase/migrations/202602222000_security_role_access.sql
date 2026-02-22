-- Security Role Access Fix
-- Ensures security guards can read all necessary society data

-- ============================================================
-- 1. ANNOUNCEMENTS - Security should be able to read announcements
-- ============================================================
-- The existing policy from admin_rls_updates allows admins.
-- The existing policy from supabase_schema may only allow society members.
-- Let's ensure security can read announcements in their society.
DROP POLICY IF EXISTS "Security can read society announcements" ON public.announcements;
CREATE POLICY "Security can read society announcements" ON public.announcements
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.uid = auth.uid() 
        AND users.society_id = announcements.society_id
    )
);

-- ============================================================
-- 2. CCTV CAMERAS - Security should see all cameras in their society
-- ============================================================
DROP POLICY IF EXISTS "Security can view society cameras" ON public.cctv_cameras;
CREATE POLICY "Security can view society cameras" ON public.cctv_cameras
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.uid = auth.uid() 
        AND users.society_id = cctv_cameras.society_id
    )
);

-- ============================================================
-- 3. VEHICLES - Security should be able to read and insert vehicles
-- ============================================================
DROP POLICY IF EXISTS "Security can insert vehicles" ON public.vehicles;
CREATE POLICY "Security can insert vehicles" ON public.vehicles
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.uid = auth.uid() 
        AND users.role = 'security'
        AND users.society_id = society_id
    )
);

-- ============================================================
-- 4. VISITORS - Ensure security can insert visitors
-- ============================================================
-- The base schema already has: "Any auth user can register visitor" FOR INSERT
-- So this should already work. Just ensure security can also UPDATE (checkout).
DROP POLICY IF EXISTS "Security can update visitors" ON public.visitors;
CREATE POLICY "Security can update visitors" ON public.visitors
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.uid = auth.uid() 
        AND users.role = 'security'
        AND users.society_id = visitors.society_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.uid = auth.uid() 
        AND users.role = 'security'
        AND users.society_id = visitors.society_id
    )
);

-- ============================================================
-- 5. EMERGENCY CONTACTS - Security should see emergency contacts
-- ============================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'emergency_contacts') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Society members can view emergency contacts" ON public.emergency_contacts';
        EXECUTE 'CREATE POLICY "Society members can view emergency contacts" ON public.emergency_contacts
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.uid = auth.uid() 
                AND users.society_id = emergency_contacts.society_id
            )
        )';
    END IF;
END $$;

-- ============================================================
-- 6. AMENITIES - Security should be able to view amenities
-- ============================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'amenities') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Society members can view amenities" ON public.amenities';
        EXECUTE 'CREATE POLICY "Society members can view amenities" ON public.amenities
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.uid = auth.uid() 
                AND users.society_id = amenities.society_id
            )
        )';
    END IF;
END $$;

-- ============================================================
-- 7. POLLS - Security should be able to view and vote in polls
-- ============================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'polls') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Society members can view polls" ON public.polls';
        EXECUTE 'CREATE POLICY "Society members can view polls" ON public.polls
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.uid = auth.uid() 
                AND users.society_id = polls.society_id
            )
        )';
    END IF;
END $$;

-- ============================================================
-- 8. DOCUMENTS - Security should be able to view documents
-- ============================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'documents') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Society members can view documents" ON public.documents';
        EXECUTE 'CREATE POLICY "Society members can view documents" ON public.documents
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.uid = auth.uid() 
                AND users.society_id = documents.society_id
            )
        )';
    END IF;
END $$;

-- ============================================================
-- 9. USERS - Ensure security can view society members (residents)
-- ============================================================
-- This policy may already exist from society_members_visibility migration,
-- but ensure it's present.
DROP POLICY IF EXISTS "security_view_society_members" ON public.users;
CREATE POLICY "security_view_society_members" ON public.users
FOR SELECT TO authenticated
USING (
    society_id = (SELECT society_id FROM public.users WHERE uid = auth.uid())
);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
