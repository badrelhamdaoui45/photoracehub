/*
  # Add price tiers and preview image

  1. Changes
    - Add price_tiers table for photographers to set pricing
    - Add preview_image field to photos table
    - Add necessary policies and indexes
    
  2. Security
    - Enable RLS on price_tiers table
    - Add proper policies for photographer access
*/

-- Add preview_image to photos table
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS preview_image text;

-- Create price_tiers table
CREATE TABLE IF NOT EXISTS price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES profiles(id) NOT NULL,
  event_name text NOT NULL,
  quantity int NOT NULL,
  price decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(photographer_id, event_name, quantity)
);

-- Enable RLS
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;

-- Create price_tiers policies
CREATE POLICY "Price tiers are viewable by everyone"
  ON price_tiers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Photographers can manage own price tiers"
  ON price_tiers FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid() AND auth.is_photographer())
  WITH CHECK (photographer_id = auth.uid() AND auth.is_photographer());

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_price_tiers_photographer_event 
ON price_tiers(photographer_id, event_name);