// frontend/api/admin/user/add.js
import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../../../api/lib/getUserWithRole'
import requireRole     from '../../../api/lib/requireRole'

// service-role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // 1) authenticate & ensure admin
  try {
    await getUserWithRole(req, res)     // populates req.user or ends with 401
    requireRole(['admin'])(req, res)    // ends with 403 if not admin
  } catch (err) {
    // getUserWithRole or requireRole already sent a response
    return
  }

  // 2) validate
  const { email, password, role, team_id } = req.body
  if (!email || !password || !role || !team_id) {
    return res.status(400).json({ error: 'email, password, role and team_id are required' })
  }

  // 3) create in Auth
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { role, team_id }
  })
  if (authErr) {
    console.error('Auth createUser error:', authErr)
    return res.status(400).json({ error: authErr.message })
  }

  // 4) mirror into your users table
  const { data: newUser, error: dbErr } = await supabaseAdmin
    .from('users')
    .insert({
      id:       authData.user.id,
      username: email,
      role,
      team_id
    })
    .single()

  if (dbErr) {
    console.error('DB insert error:', dbErr)
    return res.status(400).json({ error: dbErr.message })
  }

  // 5) success
  res.status(200).json({ message: 'User created', user: newUser })
}
