const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Load .env from the mawared-app directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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

function requireAuth(allowedRoles) {
  return async (req, res, next) => {
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
        .select('role, store_id')
        .eq('id', user.id)
        .single();

      if (!profile || !allowedRoles.includes(profile.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.authUser = user;
      req.authProfile = profile;
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

const requireAdminAuth = (req, res, next) =>
  requireAuth(['super_admin', 'admin'])(req, res, next);


async function validateStoreAccess(req, storeId) {
  if (!storeId) return true;
  const role = req.authProfile?.role;
  if (role === 'super_admin' || role === 'admin') return true;
  if (role === 'store_owner') {
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('owner_id', req.authUser.id)
      .single();
    return !!store;
  }
  if (role === 'hr_team') {
    const { data: assignment } = await supabaseAdmin
      .from('hr_team_assignments')
      .select('id')
      .eq('hr_member_id', req.authUser.id)
      .eq('store_id', storeId)
      .single();
    return !!assignment;
  }
  return false;
}

// Middleware for store-level operations (store owners, HR, and admins)
async function requireStoreAuth(req, res, next) {
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

    const allowedRoles = ['super_admin', 'admin', 'store_owner', 'hr_team', 'hr'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions. Store owner or admin access required.' });
    }

    req.storeUser = user;
    req.storeProfile = profile;
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

    // Check for duplicate email before creating
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const duplicate = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: `A user with email "${email}" already exists. Please use a different email address.` });
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
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: `Failed to create store owner profile: ${profileError.message}` });
    }

    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        owner_id: userId,
        store_name: storeName,
        store_number: storeNumber?.trim() || null,
        phone: phone || null,
        status: 'active',
      })
      .select()
      .single();

    if (storeError) {
      console.error('Store creation error:', storeError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: `Failed to create store: ${storeError.message}` });
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

// =============================================
// DELETE USER ENDPOINT
// =============================================
app.delete('/api/admin/users/:userId', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Prevent deleting yourself
    if (userId === req.adminUser.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user is a store_owner, delete their stores and related employees first
    if (profile.role === 'store_owner') {
      const { data: stores } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('owner_id', userId);

      if (stores && stores.length > 0) {
        const storeIds = stores.map(s => s.id);
        // Delete employees linked to these stores
        await supabaseAdmin.from('employees').delete().in('store_id', storeIds);
        // Delete the stores
        await supabaseAdmin.from('stores').delete().in('id', storeIds);
      }
    }

    // Delete employee records if any
    await supabaseAdmin.from('employees').delete().eq('user_id', userId);

    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Auth delete error (profile already removed):', authError.message);
    }

    res.json({ success: true, message: `User ${profile.full_name || profile.email} deleted successfully` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// BULK DELETE USERS ENDPOINT
// =============================================
app.post('/api/admin/users/bulk-delete', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'An array of user IDs is required' });
    }

    // Prevent deleting yourself
    if (userIds.includes(req.adminUser.id)) {
      return res.status(400).json({ error: 'You cannot delete your own account. Remove yourself from the selection.' });
    }

    const results = { deleted: 0, failed: 0, errors: [] };

    for (const userId of userIds) {
      try {
        // Check if user is a store_owner
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, role')
          .eq('id', userId)
          .single();

        if (profile?.role === 'store_owner') {
          const { data: stores } = await supabaseAdmin
            .from('stores')
            .select('id')
            .eq('owner_id', userId);

          if (stores && stores.length > 0) {
            const storeIds = stores.map(s => s.id);
            await supabaseAdmin.from('employees').delete().in('store_id', storeIds);
            await supabaseAdmin.from('stores').delete().in('id', storeIds);
          }
        }

        await supabaseAdmin.from('employees').delete().eq('user_id', userId);
        await supabaseAdmin.from('profiles').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.deleted++;
      } catch (err) {
        results.failed++;
        results.errors.push({ userId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Deleted ${results.deleted} user(s). ${results.failed > 0 ? `${results.failed} failed.` : ''}`,
      ...results,
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// RESEND CREDENTIALS EMAIL ENDPOINT
// =============================================
app.post('/api/admin/resend-credentials', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Look up user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Generate new temp password
    const tempPassword = generateTempPassword();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Look up store info if they are a store owner
    let storeName = '';
    if (profile.role === 'store_owner') {
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('store_name')
        .eq('owner_id', userId)
        .single();
      storeName = store?.store_name || '';
    }

    // Send credentials email
    const emailResult = await sendBrevoEmail(
      { email: profile.email, name: profile.full_name },
      'Mawared - Your Account Credentials',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4A843; margin: 0;">Mawared</h1>
          <p style="color: #666; margin: 5px 0;">Employee Affairs Management Platform</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Hello, ${profile.full_name}!</h2>
          <p style="color: #555; line-height: 1.6;">Your login credentials have been updated. Please use the details below to access your account.</p>
          <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #D4A843; margin-top: 0;">Your Login Credentials</h3>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${profile.email}</p>
            <p style="margin: 8px 0;"><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            ${storeName ? `<p style="margin: 8px 0;"><strong>Store:</strong> ${storeName}</p>` : ''}
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px;">
            <p style="color: #856404; margin: 0;"><strong>Important:</strong> You will be required to change your password when you first log in.</p>
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
      tempPassword,
      emailSent: emailResult.success,
      emailError: emailResult.error || null,
    });
  } catch (error) {
    console.error('Resend credentials error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// UPDATE STORE OWNER PROFILE ENDPOINT
// =============================================
app.post('/api/admin/update-store-owner', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase service role key not configured' });
    }

    const { userId, fullName, phone, email } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const profileUpdates = {};
    if (fullName !== undefined) profileUpdates.full_name = fullName;
    if (phone !== undefined) profileUpdates.phone = phone || null;
    if (email !== undefined) profileUpdates.email = email;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    // If email changed, update auth email too
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
      });
      if (authError) {
        console.error('Auth email update error:', authError);
        // Don't fail the whole request, profile was updated
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update store owner error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PLANS_FILE = '/tmp/mawared_subscription_plans.json';

function loadPlansFromFile() {
  try {
    if (fs.existsSync(PLANS_FILE)) {
      return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf8'));
    }
  } catch (e) {}
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

app.get('/api/admin/subscription-plans-public', async (req, res) => {
  try {
    const plans = loadPlansFromFile();
    res.json({ success: true, plans: plans.filter(p => p.is_active) });
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
  } catch (e) {}
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

// =============================================
// ADMIN STATS ENDPOINT
// =============================================
app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Count stores
    const { count: totalStores } = await supabaseAdmin
      .from('stores')
      .select('*', { count: 'exact', head: true });

    // Count active stores
    const { count: activeStores } = await supabaseAdmin
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Count all users (profiles)
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Count employees
    const { count: totalEmployees } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Count pending leave requests
    let pendingRequests = 0;
    try {
      const { count } = await supabaseAdmin
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingRequests = count || 0;
    } catch (e) {
      // leave_requests table may not exist yet
    }

    res.json({
      success: true,
      stats: {
        totalStores: totalStores || 0,
        activeStores: activeStores || 0,
        totalUsers: totalUsers || 0,
        totalEmployees: totalEmployees || 0,
        activeSubscriptions: 0,
        pendingRequests: pendingRequests,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// RECENT ACTIVITY ENDPOINT
// =============================================
app.get('/api/admin/recent-activity', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data: recentUsers, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Recent activity error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      activity: recentUsers || [],
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// STORES CRUD ENDPOINTS
// =============================================
app.get('/api/admin/stores', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Get all stores
    const { data: stores, error } = await supabaseAdmin
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch stores error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Enrich stores with owner profiles
    const enrichedStores = await Promise.all(
      (stores || []).map(async (store) => {
        let owner_profile = null;
        if (store.owner_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, phone, role')
            .eq('id', store.owner_id)
            .single();
          owner_profile = profile;
        }
        return { ...store, owner_profile };
      })
    );

    res.json({ success: true, stores: enrichedStores });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stores/:id', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { id } = req.params;

    const { data: store, error } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get owner profile
    let owner_profile = null;
    if (store.owner_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .eq('id', store.owner_id)
        .single();
      owner_profile = profile;
    }

    // Get employee count for this store
    const { count: employeeCount } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', id);

    res.json({
      success: true,
      store: { ...store, owner_profile, employee_count: employeeCount || 0 },
    });
  } catch (error) {
    console.error('Get store details error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/toggle-store-status', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { storeId, status } = req.body;

    const { error } = await supabaseAdmin
      .from('stores')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', storeId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/update-store', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { storeId, storeName, storeNumber, phone, status } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (storeName !== undefined) updates.store_name = storeName;
    if (storeNumber !== undefined) updates.store_number = storeNumber;
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined) updates.status = status;

    const { error } = await supabaseAdmin
      .from('stores')
      .update(updates)
      .eq('id', storeId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// DELETE STORE ENDPOINT
// =============================================
app.delete('/api/admin/stores/:id', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { id } = req.params;

    // First delete related employees
    await supabaseAdmin
      .from('employees')
      .delete()
      .eq('store_id', id);

    // Then delete the store
    const { error } = await supabaseAdmin
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// BULK DELETE STORES ENDPOINT
// =============================================
app.post('/api/admin/stores/bulk-delete', requireAdminAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { storeIds } = req.body;

    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({ error: 'No store IDs provided' });
    }

    // First delete related employees for all stores
    await supabaseAdmin
      .from('employees')
      .delete()
      .in('store_id', storeIds);

    // Then delete all stores
    const { error } = await supabaseAdmin
      .from('stores')
      .delete()
      .in('id', storeIds);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, deletedCount: storeIds.length });
  } catch (error) {
    console.error('Bulk delete stores error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// STORE EMPLOYEE ENDPOINTS
// =============================================
app.post('/api/store/create-employee', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { email, password, fullName, phone, employeeNumber, department, position, salary, hireDate, role, storeId } = req.body;

    if (!email || !fullName || !employeeNumber || !storeId) {
      return res.status(400).json({ error: 'Email, full name, employee number, and store ID are required' });
    }

    const tempPassword = password || generateTempPassword();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: !password },
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
        role: role || 'employee',
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: userId,
        store_id: storeId,
        employee_number: employeeNumber,
        department: department || null,
        position: position || null,
        salary: salary ? parseFloat(salary) : null,
        hire_date: hireDate || new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Employee creation error:', employeeError);
      return res.status(400).json({ error: employeeError.message });
    }

    res.json({
      success: true,
      userId,
      employeeId: employeeData?.id || null,
      tempPassword,
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/store/employees', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    let { storeId } = req.query;
    const user = req.storeUser;

    // Auto-detect store for store owners / HR when no storeId is provided
    if (!storeId && user) {
      // Check if user owns a store
      const { data: ownedStore, error: storeErr } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownedStore) {
        storeId = ownedStore.id;
      } else {
        // Check if user is an employee/HR assigned to a store
        const { data: empRecord, error: empErr } = await supabaseAdmin
          .from('employees')
          .select('store_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (empRecord) {
          storeId = empRecord.store_id;
        }
      }
    }

    let query = supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: employees, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Manually join profiles since there's no FK relationship
    let enrichedEmployees = employees || [];
    if (enrichedEmployees.length > 0) {
      const userIds = enrichedEmployees.map(e => e.user_id).filter(Boolean);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .in('id', userIds);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });

      enrichedEmployees = enrichedEmployees.map(emp => ({
        ...emp,
        profiles: profileMap[emp.user_id] || null,
      }));
    }

    res.json({ success: true, employees: enrichedEmployees });
  } catch (error) {
    console.error('GET employees error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/store/employees/:id', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { id } = req.params;

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Manually join profile since there's no FK relationship
    let enrichedEmployee = { ...employee, profiles: null };
    if (employee.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .eq('id', employee.user_id)
        .single();
      enrichedEmployee.profiles = profile || null;
    }

    res.json({ success: true, employee: enrichedEmployee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/update-employee', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { employeeId, fullName, phone, department, position, salary, hireDate } = req.body;

    // Update employee record
    const empUpdates = { updated_at: new Date().toISOString() };
    if (department !== undefined) empUpdates.department = department;
    if (position !== undefined) empUpdates.position = position;
    if (salary !== undefined) empUpdates.salary = salary ? parseFloat(salary) : null;
    if (hireDate !== undefined) empUpdates.hire_date = hireDate;

    const { error: empError } = await supabaseAdmin
      .from('employees')
      .update(empUpdates)
      .eq('id', employeeId);

    if (empError) {
      return res.status(400).json({ error: empError.message });
    }

    // If fullName or phone changed, update profile too
    if (fullName || phone) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('user_id')
        .eq('id', employeeId)
        .single();

      if (emp?.user_id) {
        const profileUpdates = {};
        if (fullName) profileUpdates.full_name = fullName;
        if (phone !== undefined) profileUpdates.phone = phone;

        await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', emp.user_id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/toggle-employee-status', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { employeeId, status } = req.body;

    const { error } = await supabaseAdmin
      .from('employees')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/reset-employee-password', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { employeeId } = req.body;

    // Get the employee's user_id
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('user_id')
      .eq('id', employeeId)
      .single();

    if (!emp?.user_id) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const tempPassword = generateTempPassword();

    const { error } = await supabaseAdmin.auth.admin.updateUserById(emp.user_id, {
      password: tempPassword,
      user_metadata: { must_change_password: true },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, tempPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/store/employees/:id', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { id } = req.params;

    // Get the employee's user_id before deleting
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete the employee record
    const { error: delError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', id);

    if (delError) {
      return res.status(400).json({ error: delError.message });
    }

    // Also delete the auth user and profile if they exist
    if (emp.user_id) {
      await supabaseAdmin.from('profiles').delete().eq('id', emp.user_id);
      try {
        await supabaseAdmin.auth.admin.deleteUser(emp.user_id);
      } catch (e) {
        console.log('Could not delete auth user (may not exist):', e.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/store/employees/bulk-delete', requireStoreAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { employeeIds } = req.body;
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'employeeIds array is required' });
    }

    // Get user_ids for all employees being deleted
    const { data: emps } = await supabaseAdmin
      .from('employees')
      .select('id, user_id')
      .in('id', employeeIds);

    const userIds = (emps || []).map(e => e.user_id).filter(Boolean);

    // Delete employee records
    const { error: delError } = await supabaseAdmin
      .from('employees')
      .delete()
      .in('id', employeeIds);

    if (delError) {
      return res.status(400).json({ error: delError.message });
    }

    // Delete profiles and auth users
    if (userIds.length > 0) {
      await supabaseAdmin.from('profiles').delete().in('id', userIds);
      for (const uid of userIds) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(uid);
        } catch (e) {
          console.log('Could not delete auth user:', uid, e.message);
        }
      }
    }

    res.json({ success: true, deletedCount: employeeIds.length });
  } catch (error) {
    console.error('Bulk delete employees error:', error);
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
const DIST_PATH = path.join(__dirname, '..', 'dist');

if (IS_PRODUCTION) {
  app.use(express.static(DIST_PATH, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  app.use((req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
} else {
  const { createProxyMiddleware } = require('http-proxy-middleware');
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
}

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mawared API server running on port ${PORT}`);
  console.log(`Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  if (!IS_PRODUCTION) console.log(`Proxying to Metro on port ${METRO_PORT}`);
  console.log(`Supabase Admin: ${supabaseAdmin ? 'configured' : 'NOT configured'}`);
  console.log(`Brevo Email: ${BREVO_API_KEY ? 'configured' : 'NOT configured'}`);
});
