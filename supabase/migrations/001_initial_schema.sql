-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'store_owner', 'hr_team', 'employee');
CREATE TYPE employee_status AS ENUM ('active', 'on_leave', 'suspended', 'terminated');
CREATE TYPE attendance_status AS ENUM ('on_time', 'late', 'early_departure', 'absent');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled');
CREATE TYPE approval_route AS ENUM ('store_owner', 'hr_team', 'auto_approved');
CREATE TYPE payroll_status AS ENUM ('draft', 'approved', 'paid');

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'employee',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  max_employees INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  hr_consultation_hours INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STORES TABLE
-- =====================================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  commercial_registration TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  geofence_radius INTEGER NOT NULL DEFAULT 100 CHECK (geofence_radius >= 50 AND geofence_radius <= 500),
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Store owners can view own store"
  ON stores FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Store owners can update own store"
  ON stores FOR UPDATE
  USING (owner_id = auth.uid());

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  national_id TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2) NOT NULL,
  bank_account TEXT,
  emergency_contact JSONB,
  device_id TEXT UNIQUE,
  device_changed_at TIMESTAMPTZ,
  device_change_pending BOOLEAN NOT NULL DEFAULT false,
  status employee_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, employee_number)
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Store owners can view store employees"
  ON employees FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- ATTENDANCE RECORDS TABLE
-- =====================================================
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_location GEOGRAPHY(POINT, 4326) NOT NULL,
  clock_in_device_id TEXT NOT NULL,
  clock_out_time TIMESTAMPTZ,
  clock_out_location GEOGRAPHY(POINT, 4326),
  clock_out_device_id TEXT,
  status attendance_status NOT NULL DEFAULT 'on_time',
  late_minutes INTEGER NOT NULL DEFAULT 0,
  early_departure_minutes INTEGER NOT NULL DEFAULT 0,
  total_hours DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_records
CREATE POLICY "Employees can view own attendance"
  ON attendance_records FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can view store attendance"
  ON attendance_records FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_store_id ON attendance_records(store_id);
CREATE INDEX idx_attendance_clock_in_time ON attendance_records(clock_in_time);

-- =====================================================
-- LEAVE TYPES TABLE
-- =====================================================
CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code TEXT NOT NULL,
  days_per_year INTEGER NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_document BOOLEAN NOT NULL DEFAULT false,
  max_consecutive_days INTEGER,
  saudi_labor_law_compliant BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_types
CREATE POLICY "Anyone can view active leave types"
  ON leave_types FOR SELECT
  USING (is_active = true);

-- =====================================================
-- LEAVE BALANCES TABLE
-- =====================================================
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  remaining_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  accrued_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, leave_type_id, year)
);

-- Enable RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_balances
CREATE POLICY "Employees can view own leave balances"
  ON leave_balances FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- =====================================================
-- LEAVE REQUESTS TABLE
-- =====================================================
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2) NOT NULL,
  reason TEXT NOT NULL,
  supporting_document_url TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_requests
CREATE POLICY "Employees can view own leave requests"
  ON leave_requests FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can view store leave requests"
  ON leave_requests FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_store_id ON leave_requests(store_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- =====================================================
-- REQUEST TYPES TABLE
-- =====================================================
CREATE TABLE request_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  approval_route approval_route NOT NULL DEFAULT 'store_owner',
  requires_amount BOOLEAN NOT NULL DEFAULT false,
  requires_document BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- EMPLOYEE REQUESTS TABLE
-- =====================================================
CREATE TABLE employee_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  request_type_id UUID NOT NULL REFERENCES request_types(id),
  amount DECIMAL(10,2),
  description TEXT NOT NULL,
  supporting_document_url TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  generated_document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE employee_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_requests
CREATE POLICY "Employees can view own requests"
  ON employee_requests FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can view store requests"
  ON employee_requests FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- PAYROLL RECORDS TABLE
-- =====================================================
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  allowances JSONB NOT NULL DEFAULT '{}',
  deductions JSONB NOT NULL DEFAULT '{}',
  net_salary DECIMAL(10,2) NOT NULL,
  status payroll_status NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  payslip_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_records
CREATE POLICY "Employees can view own payroll"
  ON payroll_records FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can view store payroll"
  ON payroll_records FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- HR TEAM ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE hr_team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hr_member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  UNIQUE(hr_member_id, store_id)
);

-- =====================================================
-- SUPPORT TICKETS TABLE
-- =====================================================
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  store_id UUID REFERENCES stores(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_requests_updated_at BEFORE UPDATE ON employee_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON payroll_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
