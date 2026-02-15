const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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
        store_number: storeNumber || '',
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

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mawared API server running on port ${PORT}`);
  console.log(`Proxying to Metro on port ${METRO_PORT}`);
  console.log(`Supabase Admin: ${supabaseAdmin ? 'configured' : 'NOT configured'}`);
  console.log(`Brevo Email: ${BREVO_API_KEY ? 'configured' : 'NOT configured'}`);
});
