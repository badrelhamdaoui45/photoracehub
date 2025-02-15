/*
  # Add Google Authentication Support

  1. Changes
    - Add `auth.providers` column to profiles table
    - Add Google auth provider policy
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_providers text[] DEFAULT '{}';

-- Update policies for Google auth
CREATE POLICY "Allow Google authenticated users to insert profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.jwt()->>'iss' = 'https://accounts.google.com');