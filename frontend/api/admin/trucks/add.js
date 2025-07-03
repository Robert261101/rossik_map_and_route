// api/admin/trucks/add.js
import { createClient } from '@supabase/supabase-js'

// 1) read‐only client to validate the caller’s JWT
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
// 2) service‐role client to perform the insert
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function addTruckHandler(req, res) {
  console.log('▶ payload:', req.body)
  console.log('▶ have service-role key?', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // — auth header & token
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // — verify token & grab caller’s user
  const { data: { user }, error: getUserErr } = await supabaseAnon.auth.getUser(token)
  if (getUserErr || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found' })
  }

  // — fetch caller’s profile + enforce admin
  const { data: me, error: profErr } = await supabaseAnon
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profErr || !me) {
    return res.status(403).json({ error: 'Could not load your profile' })
  }
  if (me.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admins only' })
  }

  // — validate payload
  const { plate, team_id, euro_per_km, price_per_day } = req.body
    if (!plate || !team_id) {
      return res.status(400).json({ error: 'plate and team_id are required' })
    }

  const rate = typeof euro_per_km === 'number'
    ? euro_per_km
    : 0.1

  const pday = typeof price_per_day === 'number'
    ? price_per_day
    : null

  try {
    // — insert new truck
    const { data: newTruck, error: insertErr } = await supabaseAdmin
      .from('trucks')
      .insert({ plate, team_id, created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), euro_per_km: rate, price_per_day: pday })
      .single()
    if (insertErr) throw insertErr

    return res.status(201).json({ message: 'Truck added', truck: newTruck })

  } catch (err) {
    console.error('❌ /api/admin/trucks/add error:', err)
    return res.status(500).json({ error: err.message || 'Unexpected error' })
  }
}


// microsoft azure - fara pierdere date - microsoft business acum - extins pe professional

// migrare server fizic local - cloud 