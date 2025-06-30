// pages/api/admin/trucks/index.js
import { createClient } from '@supabase/supabase-js'

// 1) read‐only client to validate the caller’s JWT
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
// 2) service‐role client to bypass RLS for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // — auth header
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // — verify token & grab caller
  const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token)
  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found' })
  }

  // — load caller’s profile + enforce admin
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

  // — fetch all trucks
  const { data: trucks, error: fetchErr } = await supabaseAdmin
    .from('trucks')
    .select('id, plate, teams(name), euro_per_km')
    .order('plate')

  if (fetchErr) {
    console.error('❌ /api/admin/trucks GET error:', fetchErr)
    return res.status(500).json({ error: fetchErr.message })
  }

  return res.status(200).json(trucks)
}
