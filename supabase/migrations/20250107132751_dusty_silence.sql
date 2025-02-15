/*
  # Initial Schema Setup for Photo Marketplace

  1. New Tables
    - `profiles`
      - Extends auth.users
      - Stores photographer profile information
    - `photos`
      - Stores photo metadata and URLs
      - Links to photographer profiles
    - `purchases`
      - Tracks photo purchases
      - Links buyers and photos

  2. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  full_name text,
  bio text,
  website text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create photos table
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES profiles(id) NOT NULL,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  price decimal NOT NULL,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchases table
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) NOT NULL,
  buyer_id uuid REFERENCES profiles(id) NOT NULL,
  amount decimal NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Photos policies
CREATE POLICY "Photos are viewable by everyone"
  ON photos FOR SELECT
  USING (true);

CREATE POLICY "Photographers can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update own photos"
  ON photos FOR UPDATE
  USING (auth.uid() = photographer_id);

-- Purchases policies
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Authenticated users can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);