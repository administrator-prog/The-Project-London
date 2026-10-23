/**
 * The welcome offer: what it is worth, how long it lasts, and the switch.
 *
 * Set WELCOME_OFFER=off in Vercel to stop it. The popup stops appearing, the
 * checkout's code field disappears, and no new codes are issued or applied.
 * Checkout itself carries on at full price, exactly as it did before the offer
 * existed. Anything other than "off" — including leaving it unset — is on.
 */

export const WELCOME_PERCENT_OFF = 10
export const WELCOME_VALID_DAYS = 30

/**
 * What the visitor agrees to, word for word. Stored beside the code as the
 * record of consent, so it must match what the popup actually says — see
 * CONSENT_TEXT in src/components/layout/WelcomeOffer.tsx.
 */
export const WELCOME_CONSENT =
  'By signing up you agree to receive emails from The Project London. Unsubscribe at any time.'

export function offerEnabled(): boolean {
  return process.env.WELCOME_OFFER?.trim().toLowerCase() !== 'off'
}
