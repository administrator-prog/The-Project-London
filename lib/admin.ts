import { createToken, readCookie, verifyToken } from './access'

/**
 * The admin session.
 *
 * Its own cookie, signed with its own secret, so that admin access is a
 * separate thing from site access even though today they can be the same
 * password.
 *
 * ADMIN_PASSWORD is optional and falls back to WEBSITE_ACCESS. That is what
 * was asked for and it works with no configuration — but the site password is
 * shared with everyone who has been let past the gate, and this screen shows
 * every customer's name, address, email and phone number. Setting
 * ADMIN_PASSWORD to something else is one variable and needs no code change.
 */

export const ADMIN_COOKIE = 'tpl_admin'

/** Twelve hours, not the site wall's week. An admin session is not a visit. */
export const ADMIN_MAX_AGE_SECONDS = 12 * 60 * 60

export function adminSecret(): string | undefined {
  return process.env.ADMIN_PASSWORD?.trim() || process.env.WEBSITE_ACCESS?.trim()
}

/** True for an unexpired admin cookie this deployment signed. */
export async function isAdmin(request: Request): Promise<boolean> {
  const secret = adminSecret()
  if (!secret) return false
  return verifyToken(readCookie(request, ADMIN_COOKIE), secret)
}

export async function createAdminToken(secret: string) {
  return createToken(secret, ADMIN_MAX_AGE_SECONDS)
}

export function adminCookie(token: string) {
  return `${ADMIN_COOKIE}=${token}; Path=/; Max-Age=${ADMIN_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`
}
