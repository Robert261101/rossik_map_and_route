// pages/api/admin/truck/[id].js
import { createClient } from '@supabase/supabase-js'

// read-only client to validate JWT
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
// service-role client to bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const {
    query: { id },
    method
  } = req

  if (method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).end(`Method ${method} Not Allowed`)
  }

  // — auth header
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // — verify caller
  const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token)
  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found' })
  }

  // — enforce admin
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

  // — perform the delete
  const { error: delErr } = await supabaseAdmin
    .from('trucks')
    .delete()
    .eq('id', id)

  if (delErr) {
    console.error('❌ /api/admin/truck/[id] DELETE error:', delErr)
    return res.status(500).json({ error: delErr.message })
  }

  return res.status(204).end()
}
