import { serviceClient } from '../lib/supabase'

export const config = { runtime: 'edge' }

/**
 * Keeps the Supabase project from being paused.
 *
 * Free-tier projects are paused after a week without activity, and while the
 * site sits behind the password wall there is not enough real traffic to
 * count. A Vercel cron (see `crons` in vercel.json) calls this once a day and
 * it makes one tiny read, then overwrites the single heartbeat row in
 * public.keepalive with the current time.
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

  const pingedAt = new Date().toISOString()

  try {
    const db = serviceClient()

    // A read and a write, so the day counts as activity however Supabase
    // measures it. The write overwrites one row in public.keepalive.
    const read = await db.from('shipping_rates').select('id', { count: 'exact', head: true })
    if (read.error) {
      console.error('keepalive read failed:', read.error.message)
      return new Response('Supabase read failed', { status: 502 })
    }

    const write = await db.from('keepalive').upsert({ id: 1, pinged_at: pingedAt })
    if (write.error) {
      console.error('keepalive write failed:', write.error.message)
      return new Response('Supabase write failed', { status: 502 })
    }
  } catch (error) {
    console.error('keepalive failed:', error)
    return new Response('Supabase unreachable', { status: 502 })
  }

  // Logged so each run shows up in Vercel's runtime logs.
  console.log(`keepalive ok ${pingedAt}`)
  return new Response('ok', { headers: { 'Cache-Control': 'no-store' } })
}
