const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@mawared.app';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Mawared';

const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  : null;

async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server not configured' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions. Super admin access required.' });
    }

    req.adminUser = user;
    req.adminProfile = profile;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

async function requireStoreOwnerOrHRAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'store_owner' && profile.role !== 'hr_team' && profile.role !== 'super_admin' && profile.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    req.user = user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('Store auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!1';
}

async function sendBrevoEmail(to, subject, htmlContent) {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set, skipping email send');
    return { success: false, error: 'Brevo API key not configured' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: to.email, name: to.name }],
        subject,
        htmlContent,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Brevo API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Brevo send error:', error);
    return { success: false, error: error.message };
  }
}

app.post('/api/admin/create-store-owner', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { email, fullName, phone, storeName, storeNumber } = req.body;

    if (!email || !fullName || !storeName) {
      return res.status(400).json({ error: 'Email, full name, and store name are required' });
    }

    const tempPassword = generateTempPassword();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        role: 'store_owner',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        owner_id: userId,
        store_name: storeName,
        store_number: storeNumber || `STORE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        phone: phone || null,
        status: 'active',
      })
      .select()
      .single();

    if (storeError) {
      console.error('Store creation error:', storeError);
    }

    const emailResult = await sendBrevoEmail(
      { email, name: fullName },
      'Welcome to Mawared - Your Account Has Been Created',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4A843; margin: 0;">Mawared</h1>
          <p style="color: #666; margin: 5px 0;">Employee Affairs Management Platform</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Welcome, ${fullName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            Your store owner account has been created on the Mawared platform. 
            You can now manage your employees, attendance, leaves, and payroll.
          </p>
          
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #D4A843; margin-top: 0;">Your Login Credentials</h3>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #856404; margin: 0;">
              <strong>Important:</strong> You will be required to change your password when you first log in.
            </p>
          </div>

          ${storeData ? `
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Store Information</h3>
            <p style="margin: 8px 0;"><strong>Store Name:</strong> ${storeName}</p>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          <p>This is an automated message from Mawared. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Mawared. All rights reserved.</p>
        </div>
      </div>
      `
    );

    res.json({
      success: true,
      userId,
      storeId: storeData?.id || null,
      emailSent: emailResult.success,
      emailError: emailResult.error || null,
      tempPassword: tempPassword,
    });
  } catch (error) {
    console.error('Create store owner error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/create-hr-member', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { email, fullName, phone, storeIds } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: 'Email and full name are required' });
    }

    const tempPassword = generateTempPassword();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        role: 'hr_team',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    if (storeIds && storeIds.length > 0) {
      const assignments = storeIds.map(storeId => ({
        hr_member_id: userId,
        store_id: storeId,
        assigned_by: req.body.assignedBy || userId,
      }));

      const { error: assignError } = await supabaseAdmin
        .from('hr_team_assignments')
        .insert(assignments);

      if (assignError) {
        console.error('HR assignment error:', assignError);
      }
    }

    const emailResult = await sendBrevoEmail(
      { email, name: fullName },
      'Welcome to Mawared HR Team',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4A843; margin: 0;">Mawared</h1>
          <p style="color: #666; margin: 5px 0;">Employee Affairs Management Platform</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Welcome to the HR Team, ${fullName}!</h2>
          <p style="color: #555; line-height: 1.6;">
            You have been added as an HR team member on the Mawared platform.
          </p>
          
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #D4A843; margin-top: 0;">Your Login Credentials</h3>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px;">
            <p style="color: #856404; margin: 0;">
              <strong>Important:</strong> You will be required to change your password when you first log in.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          <p>&copy; ${new Date().getFullYear()} Mawared. All rights reserved.</p>
        </div>
      </div>
      `
    );

    res.json({
      success: true,
      userId,
      emailSent: emailResult.success,
      tempPassword,
    });
  } catch (error) {
    console.error('Create HR member error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/update-user-role', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userId, role } = req.body;
    const validRoles = ['super_admin', 'admin', 'store_owner', 'hr_team', 'employee'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/toggle-user-status', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userId, banned } = req.body;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: banned ? 'none' : '876000h',
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/recent-activity', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { data: activity, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const [storesCount, activeStoresCount, usersCount, employeesCount, pendingRequestsCount] = await Promise.all([
      supabaseAdmin.from('stores').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('stores').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('employees').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    res.json({
      success: true,
      stats: {
        totalStores: storesCount.count || 0,
        activeStores: activeStoresCount.count || 0,
        totalUsers: usersCount.count || 0,
        totalEmployees: employeesCount.count || 0,
        activeSubscriptions: activeStoresCount.count || 0,
        pendingRequests: pendingRequestsCount.count || 0,
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stores', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (storesError) throw storesError;

    // Fetch owner profiles for all stores
    const ownerIds = [...new Set(stores.map(s => s.owner_id).filter(Boolean))];
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ownerIds);

    if (profilesError) throw profilesError;

    const profileMap = profiles.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const storesWithProfiles = stores.map(store => ({
      ...store,
      owner_profile: profileMap[store.owner_id] || null
    }));

    res.json({ success: true, stores: storesWithProfiles });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/update-store', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { storeId, storeName, storeNumber, phone, status } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    const updateData = {};
    if (storeName) updateData.store_name = storeName;
    if (storeNumber !== undefined) updateData.store_number = storeNumber;
    if (phone !== undefined) updateData.phone = phone;
    if (status) updateData.status = status;

    const { data: store, error } = await supabaseAdmin
      .from('stores')
      .update(updateData)
      .eq('id', storeId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, store });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stores/:id', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { id } = req.params;

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (storeError) throw storeError;

    if (store.owner_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', store.owner_id)
        .single();
      store.owner_profile = profile;
    }

    res.json({ success: true, store });
  } catch (error) {
    console.error('Get store details error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/toggle-store-status', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { storeId, status } = req.body;

    if (!storeId || !status) {
      return res.status(400).json({ error: 'Store ID and status are required' });
    }

    const { error } = await supabaseAdmin
      .from('stores')
      .update({ status })
      .eq('id', storeId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle store status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/reset-user-password', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userId, email, fullName } = req.body;
    const tempPassword = generateTempPassword();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (email) {
      await sendBrevoEmail(
        { email, name: fullName || email },
        'Mawared - Your Password Has Been Reset',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4A843; margin: 0;">Mawared</h1>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset</h2>
            <p>Your password has been reset by an administrator.</p>
            <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0;"><strong>New Temporary Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            </div>
            <p style="color: #856404; background: #fff3cd; padding: 15px; border-radius: 8px;">
              <strong>Important:</strong> You will be required to change this password on your next login.
            </p>
          </div>
        </div>
        `
      );
    }

    res.json({ success: true, tempPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PLANS_FILE = '/tmp/mawared_subscription_plans.json';

function loadPlansFromFile() {
  try {
    if (fs.existsSync(PLANS_FILE)) {
      return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf8'));
    }
  } catch (e) { }
  return [];
}

function savePlansToFile(plans) {
  try {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2));
  } catch (e) {
    console.error('Failed to save plans:', e);
  }
}

app.get('/api/admin/subscription-plans', requireAdminAuth, async (req, res) => {
  try {
    const plans = loadPlansFromFile();
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/subscription-plans', requireAdminAuth, async (req, res) => {
  try {
    const { name, nameAr, priceMonthly, priceYearly, maxEmployees, features, hrConsultationHours } = req.body;
    const plans = loadPlansFromFile();
    const newPlan = {
      id: crypto.randomUUID(),
      name,
      name_ar: nameAr || name,
      price_monthly: priceMonthly || 0,
      price_yearly: priceYearly || 0,
      max_employees: maxEmployees || 10,
      features: features || [],
      hr_consultation_hours: hrConsultationHours || 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    plans.push(newPlan);
    savePlansToFile(plans);
    res.json({ success: true, plan: newPlan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/subscription-plans/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const plans = loadPlansFromFile();
    const index = plans.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    if (updates.name) plans[index].name = updates.name;
    if (updates.nameAr) plans[index].name_ar = updates.nameAr;
    if (updates.priceMonthly !== undefined) plans[index].price_monthly = updates.priceMonthly;
    if (updates.priceYearly !== undefined) plans[index].price_yearly = updates.priceYearly;
    if (updates.maxEmployees !== undefined) plans[index].max_employees = updates.maxEmployees;
    if (updates.features) plans[index].features = updates.features;
    if (updates.hrConsultationHours !== undefined) plans[index].hr_consultation_hours = updates.hrConsultationHours;
    if (updates.isActive !== undefined) plans[index].is_active = updates.isActive;
    savePlansToFile(plans);
    res.json({ success: true, plan: plans[index] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const SETTINGS_FILE = '/tmp/mawared_system_settings.json';

function loadSettingsFromFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch (e) { }
  return {};
}

function saveSettingsToFile(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

app.post('/api/admin/save-system-settings', requireAdminAuth, async (req, res) => {
  try {
    const { settings } = req.body;
    const existing = loadSettingsFromFile();
    const merged = { ...existing, ...settings };
    saveSettingsToFile(merged);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/system-settings', requireAdminAuth, async (req, res) => {
  try {
    const settings = loadSettingsFromFile();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/update-employee', requireStoreOwnerOrHRAuth, async (req, res) => {
  try {
    const { employeeId, fullName, phone, department, position, salary, hireDate } = req.body;

    // First update profile if needed
    if (fullName || phone) {
      const { data: employee } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();

      if (employee) {
        await supabaseAdmin
          .from('profiles')
          .update({ full_name: fullName, phone })
          .eq('id', employee.user_id);
      }
    }

    // Update employee record
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        department,
        position,
        salary: salary ? parseFloat(salary) : undefined,
        hire_date: hireDate
      })
      .eq('id', employeeId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/toggle-employee-status', requireStoreOwnerOrHRAuth, async (req, res) => {
  try {
    const { employeeId, status } = req.body;
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ status })
      .eq('id', employeeId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/reset-employee-password', requireStoreOwnerOrHRAuth, async (req, res) => {
  try {
    const { employeeId } = req.body;
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('user_id, profiles(email, full_name)')
      .eq('id', employeeId)
      .single();

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const tempPassword = generateTempPassword();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      employee.user_id,
      { password: tempPassword, user_metadata: { must_change_password: true } }
    );

    if (authError) throw authError;

    // Send email with new password
    await sendBrevoEmail(
      { email: employee.profiles.email, name: employee.profiles.full_name },
      'Password Reset - Mawared',
      `<p>Your password has been reset. Your temporary password is: <b>${tempPassword}</b></p>`
    );

    res.json({ success: true, tempPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/create-employee', requireStoreOwnerOrHRAuth, async (req, res) => {
  console.log('SERVER: create-employee started:', req.body.email, 'Role:', req.body.role);
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const {
      email,
      password,
      fullName,
      phone,
      role,
      employeeNumber,
      department,
      position,
      salary,
      hireDate,
      storeId
    } = req.body;

    if (!email || !password || !fullName || !employeeNumber || !storeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const targetRole = role === 'hr' ? 'employee' : (role || 'employee');
    const isHR = role === 'hr';

    // Step 1: Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: targetRole },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Step 2: Create profile
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        role: targetRole,
      });

    // Step 3: Create employee record
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: userId,
        store_id: storeId,
        employee_number: employeeNumber,
        department: department || null,
        position: isHR ? (position ? `HR - ${position}` : 'HR Staff') : (position || null),
        salary: salary ? parseFloat(salary) : 0,
        hire_date: hireDate || new Date().toISOString().split('T')[0],
        status: 'active',
      });

    if (employeeError) {
      console.error('Employee record creation error:', employeeError);
      // We don't rollback auth user to keep things simple, but in prod you might want to.
      return res.status(400).json({ error: 'User created but failed to save employee details: ' + employeeError.message });
    }

    res.json({ success: true, userId });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/store/employees/:id', requireStoreOwnerOrHRAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', employee.user_id)
      .single();

    employee.profiles = profile || null;

    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/store/employees', requireStoreOwnerOrHRAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { storeId } = req.query;
    let targetStoreId = storeId;

    // If no storeId provided, find the one this user is associated with
    if (!targetStoreId) {
      // First try as store owner
      const { data: ownedStore } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('owner_id', req.user.id)
        .single();

      if (ownedStore) {
        targetStoreId = ownedStore.id;
      } else {
        // Then try as employee/HR
        const { data: empRecord } = await supabaseAdmin
          .from('employees')
          .select('store_id')
          .eq('user_id', req.user.id)
          .single();

        if (empRecord) {
          targetStoreId = empRecord.store_id;
        }
      }
    }

    if (!targetStoreId) {
      return res.json({ success: true, employees: [] });
    }

    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('store_id', targetStoreId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch profiles for these employees manually to avoid join relationship issues
    if (employees && employees.length > 0) {
      const userIds = employees.map(emp => emp.user_id).filter(Boolean);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});

      employees.forEach(emp => {
        emp.profiles = profileMap[emp.user_id] || null;
      });
    }

    res.json({ success: true, employees });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/assign-hr-to-store', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { hrMemberId, storeId, assignedBy } = req.body;

    const { error } = await supabaseAdmin
      .from('hr_team_assignments')
      .insert({
        hr_member_id: hrMemberId,
        store_id: storeId,
        assigned_by: assignedBy,
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/unassign-hr-from-store', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { hrMemberId, storeId } = req.body;

    const { error } = await supabaseAdmin
      .from('hr_team_assignments')
      .delete()
      .eq('hr_member_id', hrMemberId)
      .eq('store_id', storeId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    supabaseConfigured: !!supabaseAdmin,
    brevoConfigured: !!BREVO_API_KEY,
  });
});

const METRO_PORT = 8081;

app.use(
  '/',
  createProxyMiddleware({
    target: `http://localhost:${METRO_PORT}`,
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    onProxyReq: (proxyReq) => {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
    },
    onError: (err, req, res) => {
      if (res.writeHead) {
        res.writeHead(502, { 'Content-Type': 'text/html' });
        res.end('<h1>Mawared - Starting up...</h1><p>The application is loading. Please refresh in a moment.</p>');
      }
    },
  })
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mawared API server running on port ${PORT}`);
  console.log(`Proxying to Metro on port ${METRO_PORT}`);
  console.log(`Supabase Admin: ${supabaseAdmin ? 'configured' : 'NOT configured'}`);
  console.log(`Brevo Email: ${BREVO_API_KEY ? 'configured' : 'NOT configured'}`);
});
