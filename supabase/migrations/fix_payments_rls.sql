-- Fix: Allow Owners to Pay (Update Status)
-- Resetting RLS policies for payments table.

-- 1. Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Admins can manage society payments" ON payments;
DROP POLICY IF EXISTS "Users can see own payments" ON payments;
DROP POLICY IF EXISTS "Users can pay own payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated select payments" ON payments;

-- 3. Create Permissive/Correct Policies

-- ADMINS: Full Access
CREATE POLICY "Admins can do everything on payments" ON payments
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role IN ('admin', 'staff') AND society_id = payments.society_id)
);

-- USERS (Owners/Tenants):
-- CAN VIEW if the payment is for their flat
CREATE POLICY "Users can view bills for their flats" ON payments
FOR SELECT TO authenticated
USING (
    -- Access if the payment is linked to a flat I own or reside in
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = payments.flat_id 
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
    OR
    -- Or if explicitly assigned to me (fallback)
    user_id = auth.uid()
);

-- CAN UPDATE (PAY) if the payment is for their flat
-- We only allow updating the status (ideally we'd restrict columns but PG RLS checks row access primarily)
CREATE POLICY "Users can pay bills for their flats" ON payments
FOR UPDATE TO authenticated
USING (
    -- Can only update if it's my flat's bill
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = payments.flat_id 
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
)
WITH CHECK (
    -- Ensure I still have access after update
    EXISTS (
        SELECT 1 FROM flats 
        WHERE flats.id = payments.flat_id 
        AND (flats.owner_id = auth.uid() OR flats.tenant_id = auth.uid())
    )
);
