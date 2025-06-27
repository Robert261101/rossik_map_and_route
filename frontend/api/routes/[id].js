// pages/api/routes/[id].js
import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../../lib/getUserWithRole'
import requireRole      from '../../lib/requireRole'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { id } = req.query
  // only DELETE
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }
  // auth + role check
  const user = await getUserWithRole(req)
  await requireRole(['team_lead','admin'], user)

  // ensure the route exists & belongs to user’s team
  const { data: route, error: e1 } = await supabase
    .from('routes').select('team_id').eq('id', id).single()
  if (e1 || !route) return res.status(404).json({ error: 'Route not found' })
  if (route.team_id !== user.team_id && user.role!=='admin') {
    return res.status(403).json({ error: 'Not your route' })
  }

  // delete
  const { error: e2 } = await supabase
    .from('routes').delete().eq('id', id)
  if (e2) return res.status(500).json({ error: e2.message })

  return res.json({ success: true })
}
