// frontend/api/admin/user/add.js

import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../../lib/getUserWithRole'
import requireRole     from '../../lib/requireRole'

// Use your service‐role key to perform admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // only POST allowed
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  // 1) authenticate + authorize as admin
  let me
  try {
    me = await getUserWithRole(req)
    requireRole(['admin'], me)
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message })
  }

  // 2) validate payload
  const { email, password, role, team_id } = req.body
  if (!email || !password || !role || !team_id) {
    return res.status(400).json({ error: 'email, password, role and team_id are required' })
  }

  // 3) create the user in Auth & in your users table
  try {
    // create in Supabase Auth via Admin API
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role, team_id }
    })
    if (authErr) throw authErr

    // mirror into your `public.users` table
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('users')
      .insert({
        id:           authData.user.id,
        username:     email,
        role,
        team_id
      })
      .single()
    if (rowErr) throw rowErr

    return res.status(200).json({ message: 'User created', user: row })
  } catch (err) {
    console.error('❌ /api/admin/user/add error:', err)
    return res.status(400).json({ error: err.message })
  }
}
