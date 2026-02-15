-- =====================================================
-- SEED DATA FOR MAWARED PLATFORM
-- =====================================================

-- Insert default leave types (Saudi Labor Law compliant)
INSERT INTO leave_types (name, name_ar, code, days_per_year, is_paid, requires_document, max_consecutive_days, saudi_labor_law_compliant, is_active) VALUES
  ('Annual Leave', 'إجازة سنوية', 'annual', 21, true, false, NULL, true, true),
  ('Sick Leave', 'إجازة مرضية', 'sick', 30, true, true, NULL, true, true),
  ('Emergency Leave', 'إجازة طارئة', 'emergency', 5, true, false, 5, true, true),
  ('Hajj Leave', 'إجازة حج', 'hajj', 10, false, false, 10, true, true),
  ('Maternity Leave', 'إجازة أمومة', 'maternity', 70, true, true, 70, true, true),
  ('Paternity Leave', 'إجازة أبوة', 'paternity', 3, true, false, 3, true, true),
  ('Bereavement Leave', 'إجازة وفاة', 'bereavement', 5, true, false, 5, true, true),
  ('Marriage Leave', 'إجازة زواج', 'marriage', 5, true, false, 5, true, true);

-- Insert default request types
INSERT INTO request_types (name, name_ar, code, approval_route, requires_amount, requires_document, is_active) VALUES
  ('Salary Certificate', 'شهادة راتب', 'salary_certificate', 'auto_approved', false, false, true),
  ('Experience Letter', 'شهادة خبرة', 'experience_letter', 'store_owner', false, false, true),
  ('Housing Allowance', 'بدل سكن', 'housing_allowance', 'hr_team', true, true, true),
  ('Loan Request', 'طلب قرض', 'loan_request', 'hr_team', true, true, true),
  ('Bonus Request', 'طلب مكافأة', 'bonus_request', 'store_owner', true, false, true),
  ('Advance Salary', 'سلفة راتب', 'advance_salary', 'store_owner', true, false, true),
  ('Other Request', 'طلب آخر', 'other', 'store_owner', false, false, true);

-- Insert sample subscription plans
INSERT INTO subscription_plans (name, name_ar, price_monthly, price_yearly, max_employees, features, hr_consultation_hours, is_active) VALUES
  (
    'Starter',
    'المبتدئ',
    299.00,
    2990.00,
    10,
    '["GPS Attendance", "Leave Management", "Basic Reports", "Email Support"]',
    2,
    true
  ),
  (
    'Professional',
    'المحترف',
    599.00,
    5990.00,
    50,
    '["GPS Attendance", "Leave Management", "Employee Requests", "Payroll Processing", "Advanced Reports", "Priority Support"]',
    5,
    true
  ),
  (
    'Enterprise',
    'المؤسسات',
    1299.00,
    12990.00,
    200,
    '["All Professional Features", "Multi-Branch Support", "Custom Reports", "API Access", "Dedicated Support", "Custom Integrations"]',
    10,
    true
  ),
  (
    'VIP',
    'VIP',
    0.00,
    0.00,
    999999,
    '["All Features", "Unlimited Employees", "White Label", "Custom Development", "24/7 Support"]',
    999,
    true
  );

-- Note: You'll need to create actual users and stores through the application
-- This seed data only includes reference data that doesn't require authentication
