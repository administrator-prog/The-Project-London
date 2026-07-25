/**
 * Per-instance attempt counter.
 *
 * Edge instances are short-lived and several run in parallel, so this slows
 * abuse down rather than stopping it outright. Back it with Vercel KV or
 * Upstash if a hard limit is ever needed.
 */
type Bucket = { count: number; resetAt: number }

/**
 * Bucket key for a request.
 *
 * Vercel sets `x-real-ip`, which is what @vercel/functions reads. The
 * `x-forwarded-for` fallback matters because without it a missing header would
 * put every visitor in one shared bucket, letting a single caller lock out
 * everybody else.
 */
export function clientKey(request: Request) {
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>()

  return {
    /** Records an attempt and reports whether the caller is over the limit. */
    check(key: string) {
      const now = Date.now()
      const bucket = buckets.get(key)

      if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return false
      }

      bucket.count += 1
      return bucket.count > max
    },
    reset(key: string) {
      buckets.delete(key)
    },
  }
}
