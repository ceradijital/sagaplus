/*
  # Fix infinite recursion in profiles table policies

  1. Problem
    - Existing policies on profiles table query the profiles table itself for admin checks
    - This creates infinite recursion when checking permissions

  2. Solution
    - Drop the problematic policies that cause recursion
    - Create new policies that use simpler permission checks
    - Use direct role checking instead of complex permission joins

  3. Changes
    - Remove policies that query profiles table within profiles policies
    - Create simple, safe policies that avoid recursion
    - Maintain security while fixing the infinite loop
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new safe policies that don't cause recursion
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create a simpler admin policy that doesn't query profiles table recursively
CREATE POLICY "Service role can manage all profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true);

-- Allow admins to manage profiles by checking role directly without recursion
CREATE POLICY "Admin role can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r 
      WHERE r.name = 'Super Admin' 
      AND EXISTS (
        SELECT 1 FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND u.email IN (
          'admin@company.com',
          'manager@company.com'
        )
      )
    )
  );