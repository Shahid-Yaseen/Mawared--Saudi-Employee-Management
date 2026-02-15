import { supabase } from './supabase';

const API_BASE = '';

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response received:', text.substring(0, 200));
    throw new Error(`Server returned non-JSON response (${response.status}). Expected JSON but got ${contentType || 'text/plain'}. Please ensure the backend server is running on port 5001.`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

export const adminApi = {
  createStoreOwner: (params: {
    email: string;
    fullName: string;
    phone?: string;
    storeName: string;
    storeNumber?: string;
  }) => apiCall('/api/admin/create-store-owner', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  createHRMember: (params: {
    email: string;
    fullName: string;
    phone?: string;
    storeIds?: string[];
    assignedBy?: string;
  }) => apiCall('/api/admin/create-hr-member', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  updateUserRole: (userId: string, role: string) =>
    apiCall('/api/admin/update-user-role', {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  toggleUserStatus: (userId: string, banned: boolean) =>
    apiCall('/api/admin/toggle-user-status', {
      method: 'POST',
      body: JSON.stringify({ userId, banned }),
    }),

  resetUserPassword: (userId: string, email: string, fullName: string) =>
    apiCall('/api/admin/reset-user-password', {
      method: 'POST',
      body: JSON.stringify({ userId, email, fullName }),
    }),

  createSubscriptionPlan: (params: {
    name: string;
    nameAr?: string;
    priceMonthly: number;
    priceYearly: number;
    maxEmployees: number;
    features?: string[];
    hrConsultationHours?: number;
  }) => apiCall('/api/admin/subscription-plans', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  updateSubscriptionPlan: (id: string, params: any) =>
    apiCall(`/api/admin/subscription-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    }),

  getSystemSettings: () =>
    apiCall('/api/admin/system-settings'),

  saveSystemSettings: (settings: Record<string, any>) =>
    apiCall('/api/admin/save-system-settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),

  assignHRToStore: (hrMemberId: string, storeId: string, assignedBy: string) =>
    apiCall('/api/admin/assign-hr-to-store', {
      method: 'POST',
      body: JSON.stringify({ hrMemberId, storeId, assignedBy }),
    }),

  unassignHRFromStore: (hrMemberId: string, storeId: string) =>
    apiCall('/api/admin/unassign-hr-from-store', {
      method: 'DELETE',
      body: JSON.stringify({ hrMemberId, storeId }),
    }),

  getStores: () => apiCall('/api/admin/stores'),

  getStoreDetails: (id: string) => apiCall(`/api/admin/stores/${id}`),

  toggleStoreStatus: (storeId: string, status: string) =>
    apiCall('/api/admin/toggle-store-status', {
      method: 'POST',
      body: JSON.stringify({ storeId, status }),
    }),

  updateStore: (params: {
    storeId: string;
    storeName?: string;
    storeNumber?: string;
    phone?: string;
    status?: string;
  }) => apiCall('/api/admin/update-store', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getStats: () => apiCall('/api/admin/stats'),

  getRecentActivity: () => apiCall('/api/admin/recent-activity'),

  createEmployee: (params: {
    email: string;
    password?: string;
    fullName: string;
    phone?: string;
    employeeNumber: string;
    department?: string;
    position?: string;
    salary?: string;
    hireDate?: string;
    role?: string;
    storeId: string;
  }) => apiCall('/api/store/create-employee', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  getEmployees: (storeId?: string) =>
    apiCall(`/api/store/employees${storeId ? `?storeId=${storeId}` : ''}`),

  getEmployeeDetails: (id: string) =>
    apiCall(`/api/store/employees/${id}`),

  updateEmployee: (params: {
    employeeId: string;
    fullName?: string;
    phone?: string;
    department?: string;
    position?: string;
    salary?: string;
    hireDate?: string;
  }) => apiCall('/api/store/update-employee', {
    method: 'POST',
    body: JSON.stringify(params),
  }),

  toggleEmployeeStatus: (employeeId: string, status: string) =>
    apiCall('/api/store/toggle-employee-status', {
      method: 'POST',
      body: JSON.stringify({ employeeId, status }),
    }),

  resetEmployeePassword: (employeeId: string) =>
    apiCall('/api/store/reset-employee-password', {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),

  checkHealth: () => apiCall('/api/health'),
};
