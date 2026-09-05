import Stripe from 'stripe'

/**
 * Pinned deliberately. Stripe changes shapes between versions, and an
 * unpinned client silently follows whatever the account default becomes —
 * which is how a webhook starts reading a field that is no longer there.
 * Bump this on purpose, after reading the changelog, not by accident.
 */
export const STRIPE_API_VERSION = '2026-08-26.dahlia'

/**
 * On the edge runtime the SDK resolves its `worker` build, which talks over
 * fetch and verifies signatures with WebCrypto. Both are passed explicitly so
 * this keeps working if the bundler ever resolves the Node build instead.
 */
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')

  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
    // A dropped connection on the way to Stripe should not read as a decline.
    maxNetworkRetries: 2,
  })
}

/** Shared between the client and the webhook so both agree on the provider. */
export const cryptoProvider = Stripe.createSubtleCryptoProvider()
