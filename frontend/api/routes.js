// frontend/api/routes.js

import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../../backend/middleware/getUserWithRole'
import requireRole      from '../../backend/middleware/requireRole'



const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Only allow these roles to call this function
const ALLOWED = ['dispatcher','transport_manager','team_lead','admin']
const PRIVILEGED = ['admin']  // roles that can use any truck

export default async function handler(req, res) {
    console.log('🛠️  /api/routes handler hit! method=', req.method);

  // —1— authenticate & load user
  const user = await getUserWithRole(req)
  await requireRole(ALLOWED, user)

  // —2— handle POST /api/routes
  if (req.method === 'POST') {
    const {
      truck_id, identifier, addresses, sections, duration,
      euroPerKm, distance, costPerKm, tolls, tollCost, totalCost,
      euro_per_km, distance_km, cost_per_km, toll_cost, total_cost
    } = req.body


    console.log('method:', req.method);


    // unify names & basic validation
    const e_km   = euroPerKm   ?? euro_per_km
    const d_km   = distance    ?? distance_km
    if (!truck_id || !identifier || !Array.isArray(addresses) || e_km == null || d_km == null) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // fetch the truck to check team membership
    const { data: truck, error: tErr } = await supabase
      .from('trucks').select('team_id').eq('id', truck_id).single()

    if (tErr || !truck) {
      return res.status(403).json({ error: 'You cannot use that truck' })
    }
    if (!PRIVILEGED.includes(user.role) &&
        String(truck.team_id) !== String(user.team_id)) {
      return res.status(403).json({ error: 'You cannot use that truck' })
    }

    // do the insert
    const { data: inserted, error: iErr } = await supabase
      .from('routes')
      .insert({
        team_id:     user.team_id,
        created_by:  user.id,
        date:        new Date().toISOString(),
        identifier,
        truck_id,
        euro_per_km: e_km,
        distance_km: d_km,
        cost_per_km: costPerKm ?? cost_per_km,
        tolls,
        sections,
        addresses,
        toll_cost:   tollCost ?? toll_cost,
        total_cost:  totalCost ?? total_cost,
        duration,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      })
      .select()
      .single()

    if (iErr) {
      console.error('insert failed:', iErr)
      return res.status(500).json({ error: iErr.message })
    }

    return res.status(201).json({ success: true, route: inserted })
  }

  // —3— optionally support GET /api/routes
  if (req.method === 'GET') {
    let q = supabase
      .from('routes')
      .select('*')
      .order('date', { ascending: false })

    if (user.role !== 'admin') {
      q = q.eq('team_id', user.team_id)
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // —4— reject any other method
  res.setHeader('Allow', ['GET','POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
