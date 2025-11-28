/*
  # Create site categories table

  1. New Tables
    - `site_categories`
      - `id` (uuid, primary key)
      - `portal` (text) - The portal domain (e.g., 'mfkn.naevneneshus.dk')
      - `category_id` (uuid) - The category ID from the API
      - `category_title` (text) - The full category name
      - `aliases` (text array) - Abbreviations and alternative names (e.g., ['MBL', 'Miljøbeskyttelsesloven'])
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `site_categories` table
    - Add policy for public read access (categories are public data)
    - Add policy for authenticated writes (for system updates)
*/

CREATE TABLE IF NOT EXISTS site_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal text NOT NULL,
  category_id uuid NOT NULL,
  category_title text NOT NULL,
  aliases text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(portal, category_id)
);

CREATE INDEX IF NOT EXISTS idx_site_categories_portal ON site_categories(portal);
CREATE INDEX IF NOT EXISTS idx_site_categories_aliases ON site_categories USING GIN(aliases);

ALTER TABLE site_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site categories"
  ON site_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert site categories"
  ON site_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update site categories"
  ON site_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete site categories"
  ON site_categories FOR DELETE
  TO authenticated
  USING (true);