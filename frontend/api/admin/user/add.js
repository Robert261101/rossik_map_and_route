// pages/api/admin/user/add.js
import { createClient } from '@supabase/supabase-js'

// 1) client to *validate* incoming token + read your users table
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
// 2) client with service role to do the admin work
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  console.time('addUser')
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
  const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token)
  if (userErr || !user) {
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
  const { email, password, role, team_id } = req.body
  if (!email || !password || !role || !team_id) {
    return res.status(400).json({ error: 'email, password, role and team_id are required' })
  }

  try {
    // — create in Auth
    const { data: authData, error: authCreateErr } = 
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { role, team_id }
      })
    if (authCreateErr) throw authCreateErr

    // — mirror in your users table
    const { data: newRow, error: rowErr } = await supabaseAdmin
      .from('users')
      .insert({
        id:       authData.user.id,
        username: email,
        role,
        team_id
      })
      .single()
    if (rowErr) throw rowErr

    console.timeEnd('addUser')
    return res.status(200).json({ message: 'User created', user: newRow })

  } catch (err) {
    console.error('❌ add user error:', err)
    // service errors often come back as non-JSON HTML—so guard
    const msg = err.message ?? 'Unexpected failure'
    return res.status(500).json({ error: msg })
  }
}
