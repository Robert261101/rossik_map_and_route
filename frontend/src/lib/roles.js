// src/lib/roles.js
export const ADMIN_TEAM_ID        = '11111111-2222-3333-4444-555555555555';
export const DISPATCHERS_TEAM_ID  = '3878c639-ff6c-4458-9f8a-cb5670df4ef6';

export function roleForTeam(teamId) {
  if (teamId === ADMIN_TEAM_ID)       return 'admin';
  if (teamId === DISPATCHERS_TEAM_ID) return 'dispatcher';
  return 'transport_manager';
}
