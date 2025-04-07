/*
  # Create team management tables

  1. New Tables
    - `teams`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `name` (text) - Team name
      - `description` (text) - Team description
      
    - `team_members`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `team_id` (uuid, foreign key to teams.id)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `role` (text) - Role in the team (admin, member)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for team management
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  description text
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  UNIQUE(team_id, user_id)
);

-- Add team_id to beneficiaries table
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id);

-- Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Enable RLS on team_members table
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies for teams table
CREATE POLICY "Team admins can update their teams"
  ON teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

CREATE POLICY "Users can view teams they are members of"
  ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- Policies for team_members table
CREATE POLICY "Team admins can manage team members"
  ON team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

CREATE POLICY "Users can view their team memberships"
  ON team_members
  FOR SELECT
  USING (
    team_members.user_id = auth.uid()
  );

-- Update imported_data table to include team_id
ALTER TABLE imported_data ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id);

-- Update policies for imported_data
DROP POLICY IF EXISTS "Users can insert their own data" ON imported_data;
DROP POLICY IF EXISTS "Users can read their own data" ON imported_data;

CREATE POLICY "Team members can insert data for their team"
  ON imported_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = imported_data.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can read their team's data"
  ON imported_data
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = imported_data.team_id
      AND team_members.user_id = auth.uid()
    )
  );
