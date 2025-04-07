/*
  # Create imported_data table

  1. New Tables
    - `imported_data`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `data` (jsonb) - Stores the imported data in a flexible format
      
  2. Security
    - Enable RLS on `imported_data` table
    - Add policy for authenticated users to insert and read their own data
*/

CREATE TABLE IF NOT EXISTS imported_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  data jsonb NOT NULL
);

ALTER TABLE imported_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own data"
  ON imported_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their own data"
  ON imported_data
  FOR SELECT
  TO authenticated
  USING (true);