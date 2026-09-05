import { formatPence } from './money'
import type { PlacedItem } from './commerce'

/**
 * Resend, over its REST API rather than the SDK — it is one POST, and the
 * edge bundle stays small.
 *
 * Sending is best-effort by design. The caller has already been paid and the
 * order is already recorded; a bounced confirmation must never turn into a
 * failed webhook, because Stripe would then retry the whole delivery and the
 * studio would get the same order five times.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ORDER_FROM_EMAIL

  if (!apiKey || !from) {
    console.error('Resend is not configured — RESEND_API_KEY and ORDER_FROM_EMAIL are required')
    return false
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    if (!response.ok) {
      console.error('Resend rejected the email', response.status, await response.text())
      return false
    }
    return true
  } catch (error) {
    console.error('Resend unreachable', error)
    return false
  }
}

/* -------------------------------------------------------------------------
 * Templates
 *
 * Tables and inline styles, because email clients are twenty years behind the
 * browser and Outlook still renders through Word. No web fonts either — they
 * fail silently in most clients, so the stack falls back to a real serif that
 * is closer to the site than Arial would be.
 * ---------------------------------------------------------------------- */

const INK = '#1a1a1a'
const ASH = '#8a8580'
const FOG = '#57534e'
const LINE = '#e5e1dc'
const PAPER = '#faf8f5'

const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemRows(items: PlacedItem[], currency: string): string {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${INK};">
          <div style="font-family:${SERIF};font-size:17px;line-height:1.3;">${escapeHtml(item.productName)}</div>
          <div style="margin-top:6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${ASH};">
            Size ${escapeHtml(item.size)} &nbsp;·&nbsp; Quantity ${item.quantity}
          </div>
        </td>
        <td align="right" style="padding:16px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${FOG};white-space:nowrap;">
          ${formatPence(item.unitPricePence * item.quantity, currency)}
        </td>
      </tr>`,
    )
    .join('')
}

function totalRow(label: string, value: string, strong = false): string {
  return `
    <tr>
      <td style="padding:6px 0;font-family:${SANS};font-size:${strong ? '14px' : '13px'};color:${strong ? INK : FOG};${strong ? 'letter-spacing:0.08em;text-transform:uppercase;' : ''}">${label}</td>
      <td align="right" style="padding:6px 0;font-family:${strong ? SERIF : SANS};font-size:${strong ? '18px' : '13px'};color:${strong ? INK : FOG};white-space:nowrap;">${value}</td>
    </tr>`
}

function shell(preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${PAPER};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
    <tr>
      <td align="center" style="padding:48px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:40px;font-family:${SANS};font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${INK};">
              The Project London
            </td>
          </tr>
          ${body}
          <tr>
            <td style="padding-top:44px;border-top:1px solid ${LINE};font-family:${SANS};font-size:12px;line-height:1.8;color:${ASH};">
              The Project London · London<br>
              Questions? Simply reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface ConfirmationArgs {
  reference: string
  customerName?: string | null
  currency: string
  items: PlacedItem[]
  subtotalPence: number
  shippingPence: number | null
  totalPence: number | null
  shippingMethod?: string | null
  shippingAddress?: Record<string, unknown> | null
}

/** The receipt. Quiet, like the rest of it — no marketing, no upsell. */
export function confirmationEmail(order: ConfirmationArgs): { subject: string; html: string } {
  const firstName = (order.customerName ?? '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Thank you, ${escapeHtml(firstName)}` : 'Thank you'

  const body = `
    <tr>
      <td style="font-family:${SERIF};font-size:34px;line-height:1.2;color:${INK};padding-bottom:18px;">
        ${greeting}
      </td>
    </tr>
    <tr>
      <td style="font-family:${SANS};font-size:14px;line-height:1.75;color:${FOG};padding-bottom:8px;">
        Your order is confirmed. We are preparing it now and will email you the moment
        it leaves the studio.
      </td>
    </tr>
    <tr>
      <td style="font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${ASH};padding:24px 0 8px;">
        Order ${escapeHtml(order.reference)}
      </td>
    </tr>
    <tr>
      <td style="padding-top:12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemRows(order.items, order.currency)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${totalRow('Subtotal', formatPence(order.subtotalPence, order.currency))}
          ${totalRow(
            escapeHtml(order.shippingMethod || 'Shipping'),
            order.shippingPence === null
              ? '—'
              : order.shippingPence === 0
                ? 'Complimentary'
                : formatPence(order.shippingPence, order.currency),
          )}
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid ${LINE};padding-top:6px;">
          ${totalRow('Total', formatPence(order.totalPence ?? order.subtotalPence, order.currency), true)}
        </table>
      </td>
    </tr>
    ${
      order.shippingAddress
        ? `<tr>
      <td style="padding-top:36px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${ASH};padding-bottom:10px;">
        Delivering to
      </td>
    </tr>
    <tr>
      <td style="font-family:${SANS};font-size:14px;line-height:1.7;color:${FOG};">
        ${formatAddress(order.shippingAddress)}
      </td>
    </tr>`
        : ''
    }
    <tr>
      <td style="padding-top:36px;font-family:${SANS};font-size:13px;line-height:1.8;color:${ASH};">
        Returns are accepted within 14 days of delivery, unworn and with tags attached.
      </td>
    </tr>`

  return {
    subject: `Your order ${order.reference} — The Project London`,
    html: shell(`Order ${order.reference} confirmed.`, body),
  }
}

export interface StudioArgs extends ConfirmationArgs {
  email?: string | null
  phone?: string | null
  shippingZone: string
  stockShortfall: boolean
}

/** The studio's copy: everything needed to pack and post it. */
export function studioEmail(order: StudioArgs): { subject: string; html: string } {
  const pieces = order.items.reduce((n, i) => n + i.quantity, 0)

  const body = `
    ${
      order.stockShortfall
        ? `<tr>
      <td style="padding:14px 16px;margin-bottom:20px;background:#fdf3e7;border-left:2px solid #b4763a;font-family:${SANS};font-size:13px;line-height:1.7;color:#7a4d1d;">
        <strong>Stock shortfall.</strong> This order was paid but could not be fully
        deducted — a size sold out between checkout and payment. Check the order in
        Supabase before dispatching.
      </td>
    </tr>
    <tr><td style="height:24px;"></td></tr>`
        : ''
    }
    <tr>
      <td style="font-family:${SERIF};font-size:30px;line-height:1.2;color:${INK};padding-bottom:6px;">
        New order · ${escapeHtml(order.reference)}
      </td>
    </tr>
    <tr>
      <td style="font-family:${SANS};font-size:13px;line-height:1.7;color:${ASH};padding-bottom:26px;">
        ${pieces} ${pieces === 1 ? 'piece' : 'pieces'} ·
        ${formatPence(order.totalPence ?? order.subtotalPence, order.currency)} ·
        ${escapeHtml(order.shippingZone === 'uk' ? 'United Kingdom' : 'International')}
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemRows(order.items, order.currency)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${totalRow('Subtotal', formatPence(order.subtotalPence, order.currency))}
          ${totalRow(
            escapeHtml(order.shippingMethod || 'Shipping'),
            order.shippingPence === null
              ? '—'
              : formatPence(order.shippingPence, order.currency),
          )}
          ${totalRow('Total', formatPence(order.totalPence ?? order.subtotalPence, order.currency), true)}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-top:36px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${ASH};padding-bottom:10px;">
        Ship to
      </td>
    </tr>
    <tr>
      <td style="font-family:${SANS};font-size:14px;line-height:1.7;color:${FOG};">
        ${order.shippingAddress ? formatAddress(order.shippingAddress) : '—'}
      </td>
    </tr>
    <tr>
      <td style="padding-top:24px;font-family:${SANS};font-size:14px;line-height:1.7;color:${FOG};">
        ${escapeHtml(order.email ?? '—')}${order.phone ? `<br>${escapeHtml(order.phone)}` : ''}
      </td>
    </tr>`

  return {
    subject: `New order ${order.reference} · ${formatPence(order.totalPence ?? order.subtotalPence, order.currency)}`,
    html: shell(`New order ${order.reference}.`, body),
  }
}

/** Stripe's address object, rendered as a postal address. */
export function formatAddress(address: Record<string, unknown>): string {
  const get = (key: string) => {
    const value = address[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  const lines = [
    get('name'),
    get('line1'),
    get('line2'),
    [get('city'), get('postal_code')].filter(Boolean).join(', ') || null,
    get('state'),
    get('country'),
  ].filter((line): line is string => Boolean(line))

  return lines.map(escapeHtml).join('<br>')
}
