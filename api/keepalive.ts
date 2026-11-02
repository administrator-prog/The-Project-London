import { serviceClient } from '../lib/supabase'

export const config = { runtime: 'edge' }

/**
 * Keeps the Supabase project from being paused.
 *
 * Free-tier projects are paused after a week without activity, and while the
 * site sits behind the password wall there is not enough real traffic to
 * count. A Vercel cron (see `crons` in vercel.json) calls this once a day and
 * it makes one tiny read against the database. Nothing is written.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on cron requests when
 * CRON_SECRET is set on the project, so that is the only thing accepted here.
 * Without it the route refuses everyone rather than leaving an open endpoint
 * that pokes the database on demand.
 *
 * Outside the password wall (see middleware.ts), because the cron has no
 * session cookie and would otherwise be redirected to /access every day.
 */
export default async function handler(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.error('CRON_SECRET is not set; keepalive refused')
    return new Response('Not configured', { status: 503 })
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { error } = await serviceClient()
      .from('shipping_rates')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('keepalive query failed:', error.message)
      return new Response('Supabase query failed', { status: 502 })
    }
  } catch (error) {
    console.error('keepalive failed:', error)
    return new Response('Supabase unreachable', { status: 502 })
  }

  return new Response('ok', { headers: { 'Cache-Control': 'no-store' } })
}
