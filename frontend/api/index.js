// frontend/api/index.js
import adminTeamsId        from '../server/admin/teams/[id].js'
import adminTeamsIndex     from '../server/admin/teams/index.js'
import adminTrucksId       from '../server/admin/trucks/[id].js'
import adminTrucksAdd      from '../server/admin/trucks/add.js'
import adminTrucksIndex    from '../server/admin/trucks/index.js'
import adminUserAdd        from '../server/admin/user/add.js'

import routesIndex         from '../server/routes.js'
import routesId            from '../server/routes/[id].js'

import spotgoId            from '../server/spotgo/[id].js'
import spotgoSubmit        from '../server/spotgo/submit.js'
import spotgoTrucksId      from '../server/spotgo/trucks/[id].js'
import spotgoTrucksSubmit  from '../server/spotgo/trucks/submit.js'

// Small helper: try patterns in order (specific → generic)
const routes = [
  // Admin: trucks
  { rx: /^admin\/trucks\/add$/,               call: (req,res)=>adminTrucksAdd(req,res) },
  { rx: /^admin\/trucks\/([^/]+)$/,           call: (req,res,m)=>{ req.query={...req.query,id:m[1]}; return adminTrucksId(req,res) } },
  { rx: /^admin\/trucks$/,                    call: (req,res)=>adminTrucksIndex(req,res) },

  // Admin: teams
  { rx: /^admin\/teams\/([^/]+)$/,            call: (req,res,m)=>{ req.query={...req.query,id:m[1]}; return adminTeamsId(req,res) } },
  { rx: /^admin\/teams$/,                     call: (req,res)=>adminTeamsIndex(req,res) },

  // Admin: users
  { rx: /^admin\/user\/add$/,                 call: (req,res)=>adminUserAdd(req,res) },

  // Routes
  { rx: /^routes\/([^/]+)$/,                  call: (req,res,m)=>{ req.query={...req.query,id:m[1]}; return routesId(req,res) } },
  { rx: /^routes$/,                           call: (req,res)=>routesIndex(req,res) },

  // SpotGo
  { rx: /^spotgo\/trucks\/submit$/,           call: (req,res)=>spotgoTrucksSubmit(req,res) },
  { rx: /^spotgo\/trucks\/([^/]+)$/,          call: (req,res,m)=>{ req.query={...req.query,id:m[1]}; return spotgoTrucksId(req,res) } },
  { rx: /^spotgo\/submit$/,                   call: (req,res)=>spotgoSubmit(req,res) },
  { rx: /^spotgo\/([^/]+)$/,                  call: (req,res,m)=>{ req.query={...req.query,id:m[1]}; return spotgoId(req,res) } },
]

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost') // base only for parsing
    const subpath = url.pathname.replace(/^\/api\/?/, '') // e.g. "spotgo/123"

    for (const r of routes) {
      const m = subpath.match(r.rx)
      if (m) return r.call(req, res, m)
    }

    res.status(404).json({ error: 'Not found', path: subpath })
  } catch (e) {
    console.error('API error:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
