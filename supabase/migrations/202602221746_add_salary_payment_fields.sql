-- Add payment_method and transaction_id to salary_payments table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salary_payments' AND column_name='payment_method') THEN
        ALTER TABLE salary_payments ADD COLUMN payment_method TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='salary_payments' AND column_name='transaction_id') THEN
        ALTER TABLE salary_payments ADD COLUMN transaction_id TEXT;
    END IF;
END $$;

-- Reload schema for PostgREST
NOTIFY pgrst, 'reload schema';
