import { supabase } from './supabase';

const API_BASE = '';

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

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

  checkHealth: () => apiCall('/api/health'),
};
