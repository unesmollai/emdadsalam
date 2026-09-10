-- Add password column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password text;

-- Update existing users with a default password (if any)
UPDATE profiles SET password = code WHERE password IS NULL;