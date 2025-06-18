// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import our centralized Supabase clients
const { supabaseAdmin } = require('./lib/supabase');

// Auth stack
const authMiddleware    = require('./middleware/authMiddleware');
const getUserWithRole   = require('./middleware/getUserWithRole');
const requireRole       = require('./middleware/requireRole');

const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4';

const app = express();
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cors());

// ─────────────────────────────────────────────────────
// All /api/* routes now require a valid Supabase JWT,
// and will have both req.authUser and req.supabase set.
// ─────────────────────────────────────────────────────
app.use('/api', authMiddleware, getUserWithRole);

// WHO AM I
app.get('/api/users/me', (req, res) => {
  res.json(req.user);
});

// LIST ROUTES (dispatcher, transport_manager, team_lead, admin)
app.get(
  '/api/routes',
  requireRole('dispatcher','transport_manager','team_lead','admin'),
  async (req, res) => {
    try {
      let query = req.supabase
        .from('routes')
        .select('*, users:created_by(username), trucks!inner(plate), sections')
        .order('date', { ascending: false });

      if (req.user.role !== 'admin') {
        query = query.eq('team_id', req.user.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// SAVE A NEW ROUTE (dispatcher, transport_manager, team_lead, admin)
app.post(
  '/api/routes',
  requireRole('dispatcher','transport_manager','team_lead','admin'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const teamId = req.user.team_id;
      const {
        truck_id, identifier, addresses, sections, duration,
        euroPerKm, distance, costPerKm,
        tollCost, totalCost,
        euro_per_km, distance_km, cost_per_km,
        toll_cost, total_cost
      } = req.body;

      // Normalize camelCase or snake_case
      const e_km   = euroPerKm  ?? euro_per_km;
      const d_km   = distance    ?? distance_km;
      const c_km   = costPerKm   ?? cost_per_km;
      const t_cost = tollCost    ?? toll_cost;
      const tot    = totalCost   ?? total_cost;

      if (!truck_id || !identifier || !Array.isArray(addresses) || e_km == null || d_km == null) {
        return res.status(400).json({
          error: 'truck_id, identifier, addresses, euro_per_km and distance_km are required'
        });
      }

      // Ensure the truck belongs to this team
      const { data: truck, error: truckErr } = await req.supabase
        .from('trucks')
        .select('team_id')
        .eq('id', truck_id)
        .single();

      if (truckErr || !truck || truck.team_id !== teamId) {
        return res.status(403).json({ error: 'You cannot use that truck' });
      }

      // Insert the route
      const { data: inserted, error: insertErr } = await req.supabase
        .from('routes')
        .insert({
          team_id:      teamId,
          created_by:   userId,
          date:         req.body.date || new Date().toISOString(),
          identifier,
          truck_id,
          euro_per_km:  e_km,
          distance_km:  d_km,
          cost_per_km:  c_km,
          tolls:        req.body.tolls,
          sections,
          addresses,
          toll_cost:    t_cost,
          total_cost:   tot,
          duration,
          created_at:   new Date().toISOString(),
          updated_at:   new Date().toISOString(),
        })
        .single();

      if (insertErr) throw insertErr;
      res.status(201).json({ success: true, route: inserted });
    } catch (err) {
      console.error('Error saving route:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE A ROUTE (team_lead, admin)
app.delete(
  '/api/routes/:id',
  requireRole('team_lead','admin'),
  async (req, res) => {
    try {
      const routeId = req.params.id;
      const { data: existing, error: existErr } = await req.supabase
        .from('routes')
        .select('team_id')
        .eq('id', routeId)
        .single();

      if (existErr || !existing) {
        return res.status(404).json({ error: 'Route not found' });
      }
      if (existing.team_id !== req.user.team_id) {
        return res.status(403).json({ error: 'Cannot delete route outside your team' });
      }

      const { error: delErr } = await req.supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (delErr) throw delErr;
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting route:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ----- Admin-only: Truck management -----

// CREATE TRUCK
app.post(
  '/api/trucks',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { plate, team_id } = req.body;
      if (!plate || !team_id) {
        return res.status(400).json({ error: 'plate and team_id are required' });
      }

      const { data, error } = await req.supabase
        .from('trucks')
        .insert({
          plate,
          team_id,
          created_by: req.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (err) {
      console.error('Error creating truck:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ----- Admin-only: User management -----

// ADD USER
app.post(
  '/api/admin/user/add',
  requireRole('admin'),
  async (req, res) => {
    const { email, password, role, team_id } = req.body;
    if (!email || !password || !role || !team_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      // Create in auth schema
      const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { role, team_id },
      });
      if (createErr) throw createErr;

      // Mirror in your public users table
      await supabaseAdmin
        .from('users')
        .insert({
          id:       authData.user.id,
          username: email,
          role,
          team_id,
        });

      res.json({ message: 'User created successfully' });
    } catch (err) {
      console.error('Error creating user:', err);
      res.status(400).json({ error: err.message || 'Unknown error' });
    }
  }
);

// DELETE USER
app.delete(
  '/api/admin/user/:id',
  requireRole('admin'),
  async (req, res) => {
    const userId = req.params.id;
    try {
      // Remove from your users table
      await supabaseAdmin.from('users').delete().eq('id', userId);
      // Remove from auth schema
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;

      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// RESET PASSWORD
app.post(
  '/api/admin/user/:id/reset-password',
  requireRole('admin'),
  async (req, res) => {
    const userId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'Missing newPassword' });
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) throw error;

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      console.error('Error resetting password:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ----- Admin-only: Truck CRUD -----

// LIST TRUCKS
app.get(
  '/api/admin/trucks',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('trucks').select('*');
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Error fetching trucks:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE TRUCK
app.delete(
  '/api/admin/truck/:id',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from('trucks')
        .delete()
        .eq('id', req.params.id);
      if (error) throw error;
      res.json({ message: 'Truck deleted successfully' });
    } catch (err) {
      console.error('Error deleting truck:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ----- Admin-only: Team CRUD -----

// LIST TEAMS
app.get(
  '/api/admin/teams',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin.from('teams').select('*');
      if (error) throw error;
      res.json(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ADD TEAM
app.post(
  '/api/admin/teams/add',
  requireRole('admin'),
  async (req, res) => {
    const { name, team_lead_user_id } = req.body;
    if (!name || !team_lead_user_id) {
      return res.status(400).json({ error: 'Name and team_lead_user_id are required' });
    }

    try {
      // Create the team
      const { data: team, error: teamErr } = await supabaseAdmin
        .from('teams')
        .insert({ name, team_lead_id: team_lead_user_id })
        .select()
        .single();
      if (teamErr) throw teamErr;

      // Ensure the lead user has the 'team_lead' role
      const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', team_lead_user_id)
        .single();
      if (userErr) throw userErr;

      if (user.role !== 'team_lead') {
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({ role: 'team_lead' })
          .eq('id', team_lead_user_id);
        if (updateErr) throw updateErr;
      }

      res.status(201).json({ message: 'Team created', team });
    } catch (err) {
      console.error('Error creating team:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE TEAM
app.delete(
  '/api/admin/teams/:id',
  requireRole('admin'),
  async (req, res) => {
    try {
      // Reassign orphaned users
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ team_id: FALLBACK_TEAM_ID })
        .eq('team_id', req.params.id);
      if (updateError) throw updateError;

      // Delete the team
      const { error: deleteError } = await supabaseAdmin
        .from('teams')
        .delete()
        .eq('id', req.params.id);
      if (deleteError) throw deleteError;

      res.json({ message: 'Team deleted and users reassigned' });
    } catch (err) {
      console.error('Error deleting team:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend on http://localhost:${PORT}`));
