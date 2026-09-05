/**
 * Startup checks for the commerce routes.
 *
 * Without these, a deploy that is missing a key fails deep inside the Stripe
 * or Supabase client — an unhandled throw, an opaque 500, and a log line that
 * says nothing about which variable was not set. A route that refuses up front
 * and names the gap turns a confusing afternoon into a thirty-second fix.
 *
 * Resend is deliberately not required anywhere. An order that is recorded and
 * paid but not yet emailed is a far better outcome than a webhook that fails
 * and leaves Stripe retrying for three days.
 */

export const CHECKOUT_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
] as const

export const WEBHOOK_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const

/** The names that are not set, in the order given. */
export function missingEnv(keys: readonly string[]): string[] {
  return keys.filter((key) => !process.env[key]?.trim())
}
