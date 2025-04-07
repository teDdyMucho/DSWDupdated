/*
  # Create beneficiaries table

  1. New Tables
    - `beneficiaries`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - Personal Information:
        - `last_name` (text)
        - `first_name` (text)
        - `middle_name` (text)
        - `extension_name` (text)
        - `birth_month` (text)
        - `birth_day` (text)
        - `birth_year` (text)
        - `sex` (text)
      - Location Information:
        - `barangay` (text)
        - `psgc_city` (text)
        - `city` (text)
        - `province` (text)
      - Assistance Information:
        - `type_of_assistance` (text)
        - `amount` (numeric)
      - Identification:
        - `philsys_number` (text)
        - `beneficiary_uniq` (text, unique)
        - `contact_number` (text)
      - Classification:
        - `target_sector` (text)
        - `sub_category` (text)
        - `civil_status` (text)
      
  2. Security
    - Enable RLS on `beneficiaries` table
    - Add policies for authenticated users to insert and read data
*/

CREATE TABLE IF NOT EXISTS beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  -- Personal Information
  last_name text,
  first_name text,
  middle_name text,
  extension_name text,
  birth_month text,
  birth_day text,
  birth_year text,
  sex text,
  
  -- Location Information
  barangay text,
  psgc_city text,
  city text,
  province text,
  
  -- Assistance Information
  type_of_assistance text,
  amount numeric,
  
  -- Identification
  philsys_number text,
  beneficiary_uniq text UNIQUE,
  contact_number text,
  
  -- Classification
  target_sector text,
  sub_category text,
  civil_status text
);

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert beneficiaries"
  ON beneficiaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read beneficiaries"
  ON beneficiaries
  FOR SELECT
  TO authenticated
  USING (true);