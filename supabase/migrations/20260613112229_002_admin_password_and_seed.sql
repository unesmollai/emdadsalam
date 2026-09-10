/*
# Add admin simple password field and seed default accounts

1. Changes
- Add `password` column to admins table (4-digit code for login, e.g. 888/999)
- Seed default manager: password '999', role 'manager'
- Seed default admin: password '888', role 'admin'

2. Security
- No RLS changes needed, existing policies remain
*/

ALTER TABLE admins ADD COLUMN IF NOT EXISTS password text;

-- Seed default manager (password = 999)
INSERT INTO admins (username, password_hash, password, role, is_active)
VALUES ('manager', 'not_used', '999', 'manager', true)
ON CONFLICT (username) DO NOTHING;

-- Seed default admin (password = 888)
INSERT INTO admins (username, password_hash, password, role, is_active)
VALUES ('admin_1', 'not_used', '888', 'admin', true)
ON CONFLICT (username) DO NOTHING;
