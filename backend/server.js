// server.js
require('dotenv').config();
const { supabaseAnon, supabaseService } = require('./lib/supabase');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');

const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4';

// for now, keep existing code working by aliasing:
const supabase = supabaseService;
const supabaseAdmin = supabaseService;

// -- Middleware Imports --
const getUserWithRole = require('./middleware/getUserWithRole');
const requireRole = require('./middleware/requireRole');

const spotgoSubmit = require('./routes/spotgo/submit');
const spotgoDelete = require('./routes/spotgo/delete');
const spotgoUpdate = require('./routes/spotgo/update');

const vehiclesSubmit = require('./routes/spotgo/trucks/submit');
const vehiclesDelete = require('./routes/spotgo/trucks/delete');
const vehiclesUpdate = require('./routes/spotgo/trucks/update');

const cleanupExpiredRoutes = require("./routes/spotgo/cleanupExpired");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cors());

// -- PUBLIC: Login Endpoint --
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ message: error.message });
  res.json({ token: data.session.access_token, user: data.user });
});

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}


// === HAULIER ONBOARDING: VALIDATE INVITE (public) ===
app.get('/api/onboarding/validate', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const tokenHash = hashToken(String(token));

    const { data: invite, error } = await supabaseAdmin
      .from('haulier_invites')
      .select('id, carrier_name, contact_email, status, expires_at')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !invite) {
      return res.status(404).json({ error: 'Invalid or unknown invite' });
    }

    const now = new Date();
    if (
      invite.status !== 'pending' ||
      (invite.expires_at && new Date(invite.expires_at) < now)
    ) {
      return res.status(404).json({ error: 'Invite expired or already used' });
    }

    return res.json({
      inviteId: invite.id,
      carrierName: invite.carrier_name,
      contactEmail: invite.contact_email,
    });
  } catch (err) {
    console.error('Error in /api/onboarding/validate:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// === HAULIER ONBOARDING: SUBMIT FORM (public) ===
app.post(
  '/api/onboarding/submit',
  upload.fields([
    { name: 'cmrInsurance', maxCount: 1 },
    { name: 'cmrPayment', maxCount: 1 },
    { name: 'euLicense', maxCount: 1 },
    { name: 'ibanConfirmation', maxCount: 1 },
    { name: 'otherDocs', maxCount: 10 },
  ]),
  async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    try {
      const tokenHash = hashToken(String(token));

      // 1) Validate invite
      const { data: invite, error: inviteError } = await supabaseAdmin
      .from('haulier_invites')
      .select('id, status, expires_at, carrier_name, contact_email')
      .eq('token_hash', tokenHash)
      .single();

      if (inviteError || !invite) {
        return res.status(404).json({ error: 'Invalid invite' });
      }

      const now = new Date();
      if (
        invite.status !== 'pending' ||
        (invite.expires_at && new Date(invite.expires_at) < now)
      ) {
        return res.status(400).json({ error: 'Invite expired or already used' });
      }

      const body = req.body;

      // default company + email from invite, rest optional for now
      const company_name        = body.companyName || invite.carrier_name || null;
      const legal_address       = body.legalAddress || null;
      const country             = body.country || null;
      const vat_number          = body.vatNumber || null;
      const registration_number = body.registrationNumber || null;
      const contact_name        = body.contactName || null;
      const contact_email       = body.contactEmail || invite.contact_email || null;
      const contact_phone       = body.contactPhone || null;
      const iban                = body.iban || null;
      const bank_name           = body.bankName || null;
      const swift_bic           = body.swiftBic || null;
      const notes               = body.notes || null;
      const language            = body.language || null;

      // no required-field check here; for now only docs are required

      if (!company_name || !legal_address || !country || !vat_number ||
          !contact_name || !contact_email || !contact_phone || !iban || !bank_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 3) Upload files to Supabase Storage
      const bucket = 'haulier-onboarding';
      const prefix = invite.id; // one folder per invite

      async function uploadOne(file, subfolder) {
        if (!file) return null;
        const filename = `${Date.now()}-${file.originalname}`;
        const path = `${prefix}/${subfolder}/${filename}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from(bucket)
          .upload(path, file.buffer, {
            contentType: file.mimetype || 'application/octet-stream',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${subfolder}`);
        }
        return path;
      }

      const files = req.files || {};

      const cmrInsuranceFile   = files.cmrInsurance?.[0];
      const cmrPaymentFile     = files.cmrPayment?.[0];
      const euLicenseFile      = files.euLicense?.[0];
      const ibanConfirmFile    = files.ibanConfirmation?.[0];
      const otherDocsFiles     = files.otherDocs || [];

      if (!cmrInsuranceFile || !euLicenseFile || !ibanConfirmFile) {
        return res.status(400).json({ error: 'Required documents missing' });
      }

      const cmr_insurance_path     = await uploadOne(cmrInsuranceFile, 'cmr-insurance');
      const cmr_payment_path       = cmrPaymentFile ? await uploadOne(cmrPaymentFile, 'cmr-payment') : null;
      const eu_license_path        = await uploadOne(euLicenseFile, 'eu-license');
      const iban_confirmation_path = await uploadOne(ibanConfirmFile, 'iban-confirmation');

      const other_docs = [];
      for (const f of otherDocsFiles) {
        const path = await uploadOne(f, 'other');
        other_docs.push({
          type: 'other',
          path,
          name: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
        });
      }

      // 4) Insert submission
      const raw_payload = {
        ...body,
        hasCmrInsurance: !!cmrInsuranceFile,
        hasEuLicense: !!euLicenseFile,
        hasIbanConfirmation: !!ibanConfirmFile,
        otherDocsCount: other_docs.length,
      };

      const { data: submission, error: insertError } = await supabaseAdmin
        .from('haulier_submissions')
        .insert({
          invite_id: invite.id,
          company_name,
          legal_address,
          country,
          vat_number,
          registration_number,
          contact_name,
          contact_email,
          contact_phone,
          iban,
          bank_name,
          swift_bic,
          notes,
          language,
          cmr_insurance_path,
          cmr_payment_path,
          eu_license_path,
          iban_confirmation_path,
          other_docs,
          raw_payload,
          sync_status: 'received',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert submission error:', insertError);
        return res.status(500).json({ error: 'Failed to save submission' });
      }

      // 5) Mark invite as completed
      const { error: updateError } = await supabaseAdmin
        .from('haulier_invites')
        .update({ status: 'completed' })
        .eq('id', invite.id);

      if (updateError) {
        console.error('Failed to update invite status:', updateError);
        // not fatal for the user
      }

      return res.status(200).json({
        success: true,
        submissionId: submission.id,
      });
    } catch (err) {
      console.error('Error in /api/onboarding/submit:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// -- PROTECTED: All /api routes after this get user+role loaded --
app.use('/api', getUserWithRole);

// === HAULIER ONBOARDING: CREATE INVITE (internal only) ===
app.post(
  '/api/onboarding/invite',
  requireRole('dispatcher', 'transport_manager', 'team_lead', 'admin'),
  async (req, res) => {
    const { carrier_name, contact_email, contact_name, expires_in_days } = req.body;

    if (!carrier_name || !contact_email) {
      return res.status(400).json({ error: 'carrier_name and contact_email are required' });
    }

    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);

      let expires_at = null;
      if (expires_in_days && Number.isFinite(Number(expires_in_days))) {
        const days = Number(expires_in_days);
        const d = new Date();
        d.setDate(d.getDate() + days);
        expires_at = d.toISOString();
      }

      const { data: invite, error } = await supabaseAdmin
        .from('haulier_invites')
        .insert({
          token_hash: tokenHash,
          carrier_name,
          contact_email,
          contact_name: contact_name || null,
          expires_at,
          created_by_user_id: req.user.id,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting haulier_invite:', error);
        return res.status(500).json({ error: 'Failed to create invite' });
      }

      const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
      const inviteUrl = `${frontendBase}/onboarding/${rawToken}`;

      return res.status(201).json({
        inviteId: invite.id,
        token: rawToken,      // raw token; only internal users see this
        inviteUrl,
      });
    } catch (err) {
      console.error('Error in /api/onboarding/invite:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// cleanup expired (admin only, now behind auth)
app.use('/api/admin/spotgo/cleanup-expired', requireRole('admin'), cleanupExpiredRoutes);

// -- WHO AM I --
app.get('/api/users/me', (req, res) => {
  // loaded by getUserWithRole
  res.json(req.user);
});

// -- LIST ROUTES (any authenticated team member) --
app.get('/api/routes', requireRole('dispatcher','transport_manager','team_lead','admin'), async (req, res) => {
  let query = supabase
    .from('routes')
    .select('*, users:created_by(username), trucks!inner(plate), sections')
    .order('date', { ascending: false });

  if (req.user.role !== 'admin') {
    query = query.eq('team_id', req.user.team_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});


// -- SAVE A NEW ROUTE (team_lead, admin only) --
app.post(
  '/api/routes',
  requireRole('dispatcher','transport_manager', 'team_lead', 'admin'),
  async (req, res) => {
    const userId = req.user.id;
    const teamId = req.user.team_id;
    // accept camelCase or snake_case
    const {
      truck_id, identifier, addresses, sections, duration,
      euroPerKm, distance, costPerKm, tolls, tollCost, totalCost,
      euro_per_km, distance_km, cost_per_km, toll_cost, total_cost, parent_route_id, via_stops_by_leg
    } = req.body;

    // unify names
    const e_km    = euroPerKm    ?? euro_per_km;
    const d_km    = distance     ?? distance_km;
    const c_km    = costPerKm    ?? cost_per_km;
    const t_cost  = tollCost     ?? toll_cost;
    const tot     = totalCost    ?? total_cost;

    // basic validation
    if (!truck_id || !identifier || !Array.isArray(addresses)
      || e_km == null || d_km == null)
    {
      return res.status(400).json({
        error: 'truck_id, identifier, addresses, euro_per_km and distance_km are required'
      });
    }

    // ensure the truck belongs to this team
    const { data: truck, error: truckErr } = await supabase
      .from('trucks')
      .select('team_id')
      .eq('id', truck_id)
      .single();

    // allow admins (and any other privileged roles) to skip the team check
    const privileged = ['admin'];
    if (truckErr || !truck) {
      return res.status(403).json({ error: 'You cannot use that truck' });
    }
    if (
      !privileged.includes(req.user.role) && 
      String(truck.team_id) !== String(teamId)
    ) {
      return res.status(403).json({ error: 'You cannot use that truck' });
    }


    // insert
    const { data: inserted, error: insertErr } = await supabase
      .from('routes')
      .insert({
        team_id: req.user.team_id,
        created_by:  userId,
        date:        req.body.date   || new Date().toISOString(),
        identifier,
        truck_id,
        euro_per_km: e_km,
        distance_km: d_km,
        cost_per_km: c_km,
        tolls,
        sections,
        addresses,
        toll_cost:   t_cost,
        total_cost:  tot,
        duration,
        parent_route_id: parent_route_id ?? null,
        via_stops_by_leg: via_stops_by_leg ?? null,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString()
      })
      .select()  // return the new row
      .single();

    if (insertErr) {
      console.error('INSERT /api/routes failed:', insertErr);
      return res.status(500).json({ error: insertErr.message });
    }

    res.status(201).json({ success: true, route: inserted });
  }
);

app.put('/api/spotgo/:id', spotgoUpdate);

// -- DELETE A ROUTE (team_lead or admin only) --
app.delete(
  '/api/routes/:id',
  requireRole('team_lead', 'admin'),
  async (req, res) => {
    const routeId = req.params.id;
    const { data: existing, error: existErr } = await supabase
      .from('routes')
      .select('team_id')
      .eq('id', routeId)
      .single();
    if (existErr || !existing) return res.status(404).json({ error: 'Route not found' });
    if (req.user.role !== 'admin' && String(existing.team_id) !== String(req.user.team_id)) {
      return res.status(403).json({ error: 'Cannot delete route outside your team' });
    }
    const { error: delErr } = await supabase
      .from('routes')
      .delete()
      .eq('id', routeId);
    if (delErr) return res.status(500).json({ error: delErr.message });
    res.json({ success: true });
  }
);

// -- Example: Admin-only truck management --
app.post(
  '/api/trucks',
  requireRole('admin'),
  async (req, res) => {
    const { plate, team_id } = req.body;
    if (!plate || !team_id) return res.status(400).json({ error: 'plate and team_id are required' });
    const { data, error } = await supabase
      .from('trucks')
      .insert({ plate, team_id, created_by: req.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  }
);

app.post('/api/admin/user/add', requireRole('admin'), async (req, res) => {
  const { email, password, role, team_id } = req.body;

  const ALLOWED_ROLES = new Set(['driver','dispatcher','transport_manager','team_lead','admin']);
  if (!email || !password || !role || !team_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // ensure team exists
  const { data: team, error: teamErr } = await supabaseService
    .from('teams')
    .select('id')
    .eq('id', team_id)
    .single();
  if (teamErr || !team) {
    return res.status(400).json({ error: 'Invalid team_id' });
  }

  try {
    // create auth user
    const { data, error: createError } = await supabaseService.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, team_id }
    });
    if (createError) throw createError;

    const authUserId = data.user.id;

    // insert profile
    const { error: insertErr } = await supabaseService.from('users').insert({
      id: authUserId,
      username: email,
      role,
      team_id
    });

    if (insertErr) {
      // rollback auth user to keep state consistent
      await supabaseService.auth.admin.deleteUser(authUserId);
      throw insertErr;
    }

    return res.status(200).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('User creation failed:', err);
    return res.status(400).json({ error: err.message || 'Unknown error' });
  }
});

app.delete('/api/admin/user/:id', requireRole('admin'), async (req, res) => {
  const userId = req.params.id;

  try {
    // Delete from public.users
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    // Delete from auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Eroare la stergerea userului:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/admin/user/:id/reset-password', requireRole('admin'), async (req, res) => {
  const userId = req.params.id;
  const { newPassword } = req.body;

  if (!newPassword) return res.status(400).json({ error: 'Parola lipsă' });

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    if (error) throw error;

    res.status(200).json({ message: 'Parolă resetată cu succes' });
  } catch (err) {
    console.error('Eroare resetare parolă:', err);
    res.status(500).json({ error: 'Resetare eșuată' });
  }
});

// /api/admin/truck (POST)
app.post('/api/admin/trucks/add', requireRole('admin'), async (req, res) => {
  const { plate, team_id } = req.body;
  const created_by = req.user.id; // presupunând că req.user e injectat de `requireRole`

  if (!plate || !team_id) {
    return res.status(400).json({ error: 'Date lipsă' });
  }

  try {
    const { error } = await supabaseAdmin.from('trucks').insert({
      plate,
      team_id,
      created_by,
    });

    if (error) throw error;
    res.status(200).json({ message: 'Camion adăugat' });
  } catch (err) {
    console.error('Eroare la adăugare camion:', err);
    res.status(500).json({ error: 'Eroare la adăugare camion' });
  }
});

// server.js (sau ce fișier folosești pt API)
app.get('/api/admin/trucks', requireRole('admin'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('trucks')
      .select('*'); // sau .select('id, plate') dacă vrei doar astea

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Eroare la fetch camioane:', err);
    res.status(500).json({ error: 'Eroare la încărcarea camioanelor' });
  }
});


app.delete('/api/admin/trucks/:id', requireRole('admin'), async (req, res) => {
  const truckId = req.params.id;

  try {
    const { error } = await supabaseAdmin
      .from('trucks')
      .delete()
      .eq('id', truckId);

    if (error) throw error;

    res.status(200).json({ message: 'Camion șters cu succes' });
  } catch (err) {
    console.error('Eroare la ștergerea camionului:', err);
    res.status(500).json({ error: 'Eroare la ștergerea camionului' });
  }
});

//list team pentru delete team
app.get('/api/admin/teams', requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase.from('teams').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


//add a team
app.post('/api/admin/teams/add', requireRole('admin'), async (req, res) => {
  const { name, team_lead_user_id } = req.body;
  if (!name || !team_lead_user_id) return res.status(400).json({ error: 'Name și team_lead_user_id sunt obligatorii' });

  try {
    // Creezi echipa
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ name, team_lead_id: team_lead_user_id })
      .select()
      .single();

    if (teamErr) throw teamErr;

    // Verifici și actualizezi userul dacă nu e team_lead deja
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('role')
      .eq('id', team_lead_user_id)
      .single();

    if (userErr) throw userErr;

    if (user.role !== 'team_lead') {
      const { error: updateErr } = await supabase
        .from('users')
        .update({ role: 'team_lead' })
        .eq('id', team_lead_user_id);

      if (updateErr) throw updateErr;
    }

    res.status(201).json({ message: 'Echipă creată', team });
  } catch (err) {
    console.error('Eroare creare echipă:', err);
    res.status(500).json({ error: 'Eroare la creare echipă' });
  }
});

//delete a team
app.delete('/api/admin/teams/:id', requireRole('admin'), async (req, res) => {
  const teamId = req.params.id;

  try {
    // Reasignezi userii care raman fara echipa
    const { error: updateError } = await supabase
      .from('users')
      .update({ team_id: FALLBACK_TEAM_ID })
      .eq('team_id', teamId);

    if (updateError) throw updateError;

    // Ștergi echipa
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) throw deleteError;


    res.status(200).json({ message: 'Echipă ștearsă și utilizatorii reasignați' });
  } catch (err) {
    console.error('Eroare la ștergere echipă:', err);
    res.status(500).json({ error: 'Eroare la ștergere echipă' });
  }
});

// SpotGo endpoints
app.post(   '/api/spotgo/submit', spotgoSubmit);
app.delete( '/api/spotgo/:id',    spotgoDelete);

// SpotGo (vehicles)
app.post(   '/api/spotgo/trucks/submit', vehiclesSubmit);
app.delete( '/api/spotgo/trucks/:id',    vehiclesDelete);
app.put(    '/api/spotgo/trucks/:id',    vehiclesUpdate);



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend on http://localhost:${PORT}`));
