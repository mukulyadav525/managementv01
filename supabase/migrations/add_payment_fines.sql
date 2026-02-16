-- Add fine_amount and fine_reason to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fine_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fine_reason TEXT;

-- Update status handling to include overdue logic if not already handled by a view or trigger
-- However, for now, we'll keep it simple and just add the columns.
