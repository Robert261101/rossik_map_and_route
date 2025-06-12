export function slugifyTeamName(name) {
  return name
    .replace(/^Team\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[^\w-]/g, '')
    .toLowerCase();
}
