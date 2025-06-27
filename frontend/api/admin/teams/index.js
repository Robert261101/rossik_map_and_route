// pages/api/admin/teams/index.js

import { createClient } from '@supabase/supabase-js'

// read‐only client to validate the JWT
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
// service‐role client for admin ops
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = auth.split(' ')[1]

  // verify user + role
  const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token)
  if (userErr || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: me, error: meErr } = await supabaseAnon
    .from('users').select('role').eq('id', user.id).single()
  if (meErr || me.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admins only' })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('teams').select('id, name').order('name')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { name, team_lead_id } = req.body
    if (!name || !team_lead_id) {
      return res.status(400).json({ error: 'name & team_lead_id required' })
    }
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({ name, team_lead_id })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.setHeader('Allow', ['GET','POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
