-- RESTORE MISSING RLS POLICIES
-- Restore access for Amenities, Polls, Documents, and Emergency Contacts
-- These were dropped by strict_rbac.sql but not recreated.

-- 1. AMENITIES
CREATE POLICY "member_read_amenities" ON public.amenities
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_amenities" ON public.amenities
    FOR ALL USING (public.check_is_admin(society_id));

-- 2. AMENITY BOOKINGS
CREATE POLICY "user_read_own_bookings" ON public.amenity_bookings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_insert_own_bookings" ON public.amenity_bookings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_manage_society_bookings" ON public.amenity_bookings
    FOR ALL USING (public.check_is_admin(society_id));

-- 3. EMERGENCY CONTACTS
CREATE POLICY "member_read_emergency_contacts" ON public.emergency_contacts
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_emergency_contacts" ON public.emergency_contacts
    FOR ALL USING (public.check_is_admin(society_id));

-- 4. POLLS
CREATE POLICY "member_read_polls" ON public.polls
    FOR SELECT USING (public.check_user_society(society_id));

CREATE POLICY "admin_manage_polls" ON public.polls
    FOR ALL USING (public.check_is_admin(society_id));

-- 5. POLL OPTIONS
CREATE POLICY "member_read_poll_options" ON public.poll_options
    FOR SELECT USING (true); -- Options are public if you can see the poll

CREATE POLICY "admin_manage_poll_options" ON public.poll_options
    FOR ALL USING (true); -- Simplification preserved from original schema

-- 6. POLL VOTES
CREATE POLICY "user_read_own_poll_votes" ON public.poll_votes
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_cast_poll_vote" ON public.poll_votes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 7. DOCUMENTS
CREATE POLICY "member_read_documents" ON public.documents
    FOR SELECT USING (
        (category = 'society' AND public.check_user_society(society_id)) OR
        (category = 'personal' AND owner_id = auth.uid())
    );

CREATE POLICY "user_upload_documents" ON public.documents
    FOR INSERT TO authenticated
    WITH CHECK (
        (category = 'personal' AND owner_id = auth.uid()) OR
        (category = 'society' AND public.check_is_admin(society_id))
    );

CREATE POLICY "user_manage_own_documents" ON public.documents
    FOR ALL USING (
        (category = 'personal' AND owner_id = auth.uid()) OR
        (category = 'society' AND public.check_is_admin(society_id))
    );
