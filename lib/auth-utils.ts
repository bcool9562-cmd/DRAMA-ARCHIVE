/**
 * Username → email helper.
 * All auth calls use this synthetic email so sessions persist
 * reliably across PC and mobile devices via Supabase Auth.
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@drama-archive.app`
}
