// pages/api/admin/trucks/index.js
import { createClient } from '@supabase/supabase-js'

// 1) read-only client to validate the caller’s JWT
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
// 2) service-role client to bypass RLS for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Only allow GET and POST
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // — auth header
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // — verify token & grab caller
  const {
    data: { user },
    error: userErr
  } = await supabaseAnon.auth.getUser(token)
  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found' })
  }

  // — load caller’s profile + enforce admin
  const {
    data: me,
    error: profErr
  } = await supabaseAnon
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

  // — POST: create a new truck
  if (req.method === 'POST') {
    const { plate, team_id, euro_per_km, price_per_day } = req.body
    if (!plate || !team_id) {
      return res.status(400).json({ error: 'plate and team_id are required' })
    }

    // coerce numeric values
    let rate = Number(euro_per_km)
    if (isNaN(rate)) rate = 0.1

    let pday = price_per_day == null ? null : Number(price_per_day)
    if (pday !== null && isNaN(pday)) pday = null

    const now = new Date().toISOString()
    const { data: newTruck, error: insertErr } = await supabaseAdmin
      .from('trucks')
      .insert({
        plate,
        team_id,
        created_by: user.id,
        created_at: now,
        updated_at: now,
        euro_per_km: rate,
        price_per_day: pday
      })
      .single()

    if (insertErr) {
      console.error('❌ /api/admin/trucks POST error:', insertErr)
      return res.status(500).json({ error: insertErr.message })
    }
    return res.status(201).json(newTruck)
  }

  // — GET: fetch all trucks
  const { data: trucks, error: fetchErr } = await supabaseAdmin
    .from('trucks')
    .select('id, plate, teams(name), euro_per_km, price_per_day')
    .order('plate')

  if (fetchErr) {
    console.error('❌ /api/admin/trucks GET error:', fetchErr)
    return res.status(500).json({ error: fetchErr.message })
  }

  return res.status(200).json(trucks)
}
