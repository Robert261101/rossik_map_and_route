// pages/api/admin/teams/[id].js

import { createClient } from '@supabase/supabase-js'

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FALLBACK_TEAM_ID = 'cf70d8dc-5451-4979-a50d-c288365c77b4'

export default async function handler(req, res) {
  const { id } = req.query
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

  if (req.method === 'DELETE') {
    // reassign any users on this team
    const { error: upErr } = await supabaseAdmin
      .from('users')
      .update({ team_id: FALLBACK_TEAM_ID })
      .eq('team_id', id)
    if (upErr) return res.status(500).json({ error: upErr.message })

    // delete the team
    const { error: delErr } = await supabaseAdmin
      .from('teams')
      .delete()
      .eq('id', id)
    if (delErr) return res.status(500).json({ error: delErr.message })

    return res.status(200).json({ message: 'Team deleted' })
  }

  res.setHeader('Allow', ['DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
