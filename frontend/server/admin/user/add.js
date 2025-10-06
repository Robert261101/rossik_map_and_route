// server/admin/user/add.js
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

const ALLOWED_ROLES = new Set(['driver', 'dispatcher', 'transport_manager', 'team_lead', 'admin'])

export default async function handler(req, res) {
  console.log('▶ payload:', req.body)
  console.log('▶ have service-role key?', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // who is calling?
  const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token)
  const caller = userData?.user
  if (userErr || !caller) return res.status(401).json({ error: 'Invalid token or user not found' })

  // caller must be admin
  const { data: me, error: meErr } = await supabaseAnon
    .from('users')
    .select('role')
    .eq('id', caller.id)
    .single()
  if (meErr || me?.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admins only' })

  const { email, password, role, team_id } = req.body || {}
  if (!email || !password || !role || !team_id) {
    return res.status(400).json({ error: 'email, password, role and team_id are required' })
  }
  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  // validate team exists
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('id', team_id)
    .single()
  if (teamErr || !team) {
    return res.status(400).json({ error: 'Invalid team_id' })
  }

  // create auth user, then profile; rollback on failure
  try {
    const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, team_id }
    })
    if (createErr) throw createErr
    const authUserId = authData.user.id

    const { error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({ id: authUserId, username: email, role, team_id })

    if (insertErr) {
      // rollback auth user for consistency
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      throw insertErr
    }

    return res.status(200).json({ message: 'User created successfully' })
  } catch (err) {
    console.error('addUser error:', err)
    return res.status(500).json({ error: err.message || 'Unexpected failure' })
  }
}
