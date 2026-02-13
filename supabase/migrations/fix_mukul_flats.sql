-- Quick diagnostic and fix for Mukul's account
-- Run this to see the current state and fix it

-- 1. Check current state
SELECT 
    u.name,
    u.email,
    u.uid,
    u.flat_ids as current_flat_ids,
    f.id as flat_id,
    f.flat_number,
    f.owner_id
FROM users u
LEFT JOIN flats f ON f.owner_id = u.uid
WHERE u.email = 'itsmukul2001@gmail.com';

-- 2. Fix Mukul's flat_ids specifically
UPDATE users
SET flat_ids = ARRAY(
    SELECT id FROM flats WHERE owner_id = users.uid
)
WHERE email = 'itsmukul2001@gmail.com';

-- 3. Verify the fix
SELECT 
    u.name,
    u.email,
    u.flat_ids as updated_flat_ids,
    (SELECT ARRAY_AGG(flat_number) FROM flats WHERE id = ANY(u.flat_ids)) as flat_numbers
FROM users u
WHERE u.email = 'itsmukul2001@gmail.com';
