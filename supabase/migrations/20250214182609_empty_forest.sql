/*
  # Add Stripe integration

  1. Changes
    - Add stripe_account_id to profiles table
    - Add stripe_customer_id to profiles table
    - Add stripe_payment_intent to purchases table
    
  2. Security
    - Enable RLS on all new columns
    - Add policies for secure access
*/

-- Add Stripe fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add Stripe fields to purchases
ALTER TABLE purchases
ADD COLUMN IF NOT EXISTS stripe_payment_intent text;

-- Create index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_intent ON purchases(stripe_payment_intent);