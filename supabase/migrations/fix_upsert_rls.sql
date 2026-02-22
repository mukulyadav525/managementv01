-- Fix upsert RLS issue during registration
-- When authStore.ts does an upsert based on email, PostgreSQL needs the user to have permission 
-- for both INSERT and UPDATE on the specific row. 

-- 1. Drop the existing own-record policies
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

-- 2. Re-create them with proper USING and WITH CHECK clauses
CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    USING (auth.uid() = uid)
    WITH CHECK (auth.uid() = uid);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    WITH CHECK (auth.uid() = uid);

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
