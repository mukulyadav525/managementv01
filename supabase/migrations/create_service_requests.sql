-- Create Service Requests Table
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id TEXT NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    flat_id TEXT NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'plumbing', 'electrical', 'cleaning', 'carpentry', 'other'
    title TEXT NOT NULL,
    description TEXT,
    preferred_time TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- 1. Members of society can see their own requests
CREATE POLICY "users_read_own_service_requests" ON public.service_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR 
        public.check_is_admin(society_id) OR
        (SELECT role FROM public.users WHERE uid = auth.uid()) = 'staff'
    );

-- 2. Residents can create requests for their flats
CREATE POLICY "residents_create_service_requests" ON public.service_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id AND
        public.check_user_society(society_id)
    );

-- 3. Users can update their own entries (or admins/staff)
CREATE POLICY "users_update_service_requests" ON public.service_requests
    FOR UPDATE USING (
        auth.uid() = requester_id OR 
        public.check_is_admin(society_id) OR
        (SELECT role FROM public.users WHERE uid = auth.uid()) = 'staff'
    );

-- Notify schema change
NOTIFY pgrst, 'reload schema';
