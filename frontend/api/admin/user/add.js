// frontend/api/admin/user/add.js
import { createClient } from '@supabase/supabase-js'
import getUserWithRole from '../../../api/lib/getUserWithRole'
import requireRole     from '../../../api/lib/requireRole'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  console.time('addUser')  
  if (req.method !== 'POST') {
    console.log('✋ wrong method', req.method)
    res.setHeader('Allow',['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  console.log('1) auth…')
  try {
    // This will send 401/403 if it fails.
    await new Promise((resolve, reject) => {
      getUserWithRole(req, res, (err) => err ? reject(err) : resolve())
    })
    requireRole(['admin'])(req, res, () => {})
  } catch (e) {
    console.error('⚠️ auth failed', e)
    return res.status(e.status || 401).json({ error: e.message })
  }
  console.log('✅ auth ok')

  const { email, password, role, team_id } = req.body
  if (!email||!password||!role||!team_id) {
    console.log('✋ missing fields')
    return res.status(400).json({ error:'email,password,role,team_id required' })
  }

  console.log('2) creating in Auth…')
  let authData
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, user_metadata:{ role, team_id }
    })
    if (error) throw error
    authData = data
    console.log('✅ created auth user', data.user.id)
  } catch (e) {
    console.error('❌ auth.createUser failed', e)
    return res.status(400).json({ error: e.message })
  }

  console.log('3) mirroring in users table…')
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id:       authData.user.id,
        username: email,
        role, team_id
      })
      .single()
    if (error) throw error
    console.log('✅ inserted row', data.id)
    console.timeEnd('addUser')
    return res.status(200).json({ message:'User created', user: data })
  } catch (e) {
    console.error('❌ db insert failed', e)
    return res.status(400).json({ error: e.message })
  }
}
