-- Add invoice_date to grns (if missing)
ALTER TABLE grns ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Add invoice_number and invoice_date to invoices (if missing)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
