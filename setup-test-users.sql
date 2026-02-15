-- Mawared App - Test Users Setup Script
-- Run this in your Supabase SQL Editor

-- Note: You'll need to create these users in Supabase Auth first, then update the profiles

-- ============================================
-- PROFILES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('employee', 'store_owner')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- EMPLOYEES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number TEXT UNIQUE,
  department TEXT,
  position TEXT,
  hire_date DATE,
  salary DECIMAL(10, 2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- STORES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_number TEXT UNIQUE,
  location TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own stores" ON stores
  FOR SELECT USING (auth.uid() = owner_id);

-- ============================================
-- ATTENDANCE TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'half_day')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own attendance" ON attendance
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ============================================
-- LEAVE REQUESTS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own leave requests" ON leave_requests
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- ============================================
-- INSTRUCTIONS FOR CREATING TEST USERS
-- ============================================

-- You need to create these users manually in Supabase Auth Dashboard:
-- Go to Authentication > Users > Add User

-- TEST USER 1 - EMPLOYEE
-- Email: employee@mawared.com
-- Password: Employee123!
-- After creating, note the User ID and run:
-- INSERT INTO profiles (id, email, full_name, phone, role)
-- VALUES ('USER_ID_HERE', 'employee@mawared.com', 'Ahmed Al-Saudi', '+966501234567', 'employee');

-- TEST USER 2 - STORE OWNER  
-- Email: owner@mawared.com
-- Password: Owner123!
-- After creating, note the User ID and run:
-- INSERT INTO profiles (id, email, full_name, phone, role)
-- VALUES ('USER_ID_HERE', 'owner@mawared.com', 'Fatima Al-Rashid', '+966509876543', 'store_owner');

-- ============================================
-- SAMPLE DATA (Optional - run after creating users)
-- ============================================

-- Add sample employee data (replace USER_ID with actual employee user ID)
-- INSERT INTO employees (user_id, employee_number, department, position, hire_date, salary)
-- VALUES ('EMPLOYEE_USER_ID', 'EMP001', 'Sales', 'Sales Associate', '2024-01-15', 5000.00);

-- Add sample store data (replace USER_ID with actual store owner user ID)
-- INSERT INTO stores (owner_id, store_name, store_number, location, phone)
-- VALUES ('OWNER_USER_ID', 'Riyadh Main Store', 'STR001', 'King Fahd Road, Riyadh', '+966112345678');

-- Add sample attendance (replace EMPLOYEE_ID with actual employee ID from employees table)
-- INSERT INTO attendance (employee_id, check_in, check_out, date, status)
-- VALUES ('EMPLOYEE_ID', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '30 minutes', CURRENT_DATE, 'present');
