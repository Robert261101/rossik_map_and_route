import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../../lib/getUserWithRole'
import requireRole      from '../../lib/requireRole'

// Use your service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    // 1) Auth + role
    const user = await getUserWithRole(req)
    requireRole(['team_lead','admin'], user)

    const { id } = req.query
    console.log(`⚡️ DELETE /api/routes/${id} by ${user.id} (${user.role})`)

    // 2) Ensure route exists & belongs to your team
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

    // 3) Delete
    const { error: delErr } = await supabase
      .from('routes')
      .delete()
      .eq('id', id)
    if (delErr) {
      console.error('❌ delete error:', delErr)
      return res.status(500).json({ error: delErr.message })
    }

    // 4) Success
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('🔥 handler error:', err)
    return res
      .status(err.status || 500)
      .json({ error: err.message || 'Internal Server Error' })
  }
}
