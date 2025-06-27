// api/admin/user/add.js
import { createClient } from '@supabase/supabase-js'

// build your two clients
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // early-method guard
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // debug incoming request
  console.log('↘️ /api/admin/user/add invoked:')
  console.log('  headers.Authorization:', req.headers.authorization)
  console.log('  body:', req.body)

  // pull payload once
  const { email, password, role, team_id } = req.body
  console.log({ email, password, role, team_id })

  // payload validation
  if (!email || !password || !role || !team_id) {
    console.log('⛔️ Missing one of the required fields')
    return res
      .status(400)
      .json({ error: 'email, password, role and team_id are required' })
  }

  // auth‐header check
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // verify caller’s JWT
  const { data: getUserData, error: getUserErr } =
    await supabaseAnon.auth.getUser(token)
  const user = getUserData?.user
  if (getUserErr || !user) {
    return res.status(401).json({ error: 'Invalid token or user not found' })
  }

  // ensure caller is admin
  const { data: me, error: meErr } = await supabaseAnon
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (meErr || me.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admins only' })
  }

  // now go create the new auth user + mirror into your users table
  try {
    const { data: authData, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { role, team_id },
        email_confirm: true
      })
    if (createErr) throw createErr

    const { data: newRow, error: rowErr } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        username: email,
        role,
        team_id
      })
      .single()
    if (rowErr) throw rowErr

    console.log('✅ Created new user row:', newRow.id)
    return res.status(200).json({ message: 'User created', user: newRow })

  } catch (err) {
    console.error('❌ addUser error:', err)
    return res.status(500).json({ error: err.message || 'Unexpected failure' })
  }
}
