// Database Types
export type UserRole = 'super_admin' | 'store_owner' | 'hr_team' | 'employee';

export type EmployeeStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export type AttendanceStatus = 'on_time' | 'late' | 'early_departure' | 'absent';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled';

export type ApprovalRoute = 'store_owner' | 'hr_team' | 'auto_approved';

// Database Tables
export interface Profile {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: UserRole;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Store {
    id: string;
    owner_id: string;
    name: string;
    name_ar: string;
    commercial_registration: string;
    location: {
        latitude: number;
        longitude: number;
    };
    geofence_radius: number; // in meters
    subscription_plan_id: string;
    subscription_status: SubscriptionStatus;
    subscription_expires_at: string;
    is_vip: boolean;
    settings: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Employee {
    id: string;
    profile_id: string;
    store_id: string;
    employee_number: string;
    national_id: string;
    department: string;
    position: string;
    hire_date: string;
    salary: number;
    bank_account: string | null;
    emergency_contact: Record<string, any> | null;
    device_id: string | null;
    device_changed_at: string | null;
    device_change_pending: boolean;
    status: EmployeeStatus;
    created_at: string;
    updated_at: string;
}

export interface AttendanceRecord {
    id: string;
    employee_id: string;
    store_id: string;
    clock_in_time: string;
    clock_in_location: {
        latitude: number;
        longitude: number;
    };
    clock_in_device_id: string;
    clock_out_time: string | null;
    clock_out_location: {
        latitude: number;
        longitude: number;
    } | null;
    clock_out_device_id: string | null;
    status: AttendanceStatus;
    late_minutes: number;
    early_departure_minutes: number;
    total_hours: number | null;
    notes: string | null;
    created_at: string;
}

export interface LeaveType {
    id: string;
    store_id: string | null;
    name: string;
    name_ar: string;
    code: string;
    days_per_year: number;
    is_paid: boolean;
    requires_document: boolean;
    max_consecutive_days: number | null;
    saudi_labor_law_compliant: boolean;
    is_active: boolean;
    created_at: string;
}

export interface LeaveBalance {
    id: string;
    employee_id: string;
    leave_type_id: string;
    year: number;
    total_days: number;
    used_days: number;
    remaining_days: number;
    accrued_days: number;
    created_at: string;
    updated_at: string;
}

export interface LeaveRequest {
    id: string;
    employee_id: string;
    store_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    supporting_document_url: string | null;
    status: RequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface RequestType {
    id: string;
    name: string;
    name_ar: string;
    code: string;
    approval_route: ApprovalRoute;
    requires_amount: boolean;
    requires_document: boolean;
    is_active: boolean;
    created_at: string;
}

export interface EmployeeRequest {
    id: string;
    employee_id: string;
    store_id: string;
    request_type_id: string;
    amount: number | null;
    description: string;
    supporting_document_url: string | null;
    status: RequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
    generated_document_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface PayrollRecord {
    id: string;
    employee_id: string;
    store_id: string;
    month: number;
    year: number;
    base_salary: number;
    overtime_hours: number;
    overtime_amount: number;
    allowances: Record<string, number>;
    deductions: Record<string, number>;
    net_salary: number;
    status: 'draft' | 'approved' | 'paid';
    paid_at: string | null;
    payslip_url: string | null;
    created_at: string;
    updated_at: string;
}

// Location Types
export interface Location {
    latitude: number;
    longitude: number;
}

export interface GeofenceValidation {
    isValid: boolean;
    distance: number;
    message?: string;
}

// Navigation Types
export type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type EmployeeTabParamList = {
    Home: undefined;
    Attendance: undefined;
    Leave: undefined;
    Requests: undefined;
    Payroll: undefined;
    Profile: undefined;
};

export type StoreOwnerTabParamList = {
    Dashboard: undefined;
    Employees: undefined;
    Approvals: undefined;
    Profile: undefined;
    Settings: undefined;
    Privacy: undefined;
    AddEmployee: undefined;
    EmployeeDetails: { employeeId: string };
};

