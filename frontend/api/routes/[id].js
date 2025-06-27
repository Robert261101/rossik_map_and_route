import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../lib/getUserWithRole'
import requireRole      from '../lib/requireRole'

// service‐role client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { id } = req.query


  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    // --- 1) auth + role check
    const user = await getUserWithRole(req)
    requireRole(['team_lead','admin'], user)

    // --- 2) ensure this route exists
    const { data: existing, error: existErr } = await supabase
      .from('routes')
      .select('team_id')
      .eq('id', id)
      .single()

    if (existErr || !existing) {
      return res.status(404).json({ error: 'Route not found' })
    }
    if (existing.team_id !== user.team_id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete route outside your team' })
    }

    // --- 3) delete
    const { error: delErr } = await supabase
      .from('routes')
      .delete()
      .eq('id', id)

    if (delErr) {
      console.error('❌ delete failed:', delErr)
      return res.status(500).json({ error: delErr.message })
    }

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('🔥 handler threw:', err)
    return res
      .status(err.status || 500)
      .json({ error: err.message || 'Internal Server Error' })
  }
}
