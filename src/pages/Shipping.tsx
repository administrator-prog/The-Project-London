import { Container } from '@/components/ui/Container'
import { PageHeader } from '@/components/ui/PageHeader'
import { Prose } from '@/components/ui/Prose'
import { Reveal } from '@/components/ui/Reveal'
import { internationalShipping, shippingNotes, ukShipping } from '@/data/policies'
import type { ShippingOption } from '@/data/policies'

export default function Shipping() {
  return (
    <div className="bg-paper pb-24 md:pb-32">
      <PageHeader
        title={'Shipping'}
        size="sm"
        description="Complimentary across the United Kingdom, a flat rate everywhere else."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Shipping' }]}
      />

      <Container>
        <div className="max-w-2xl">
          <Rates heading="United Kingdom" options={ukShipping} />
          <Rates heading="International" options={internationalShipping} className="mt-12" />

          <div className="mt-14">
            <Prose blocks={shippingNotes} />
          </div>
        </div>
      </Container>
    </div>
  )
}

/**
 * The rates as a table of two columns — service against price. These are the
 * same options, under the same names, that appear on the payment page; a
 * customer who reads this and then sees something different at checkout has
 * been told a small lie.
 */
function Rates({
  heading,
  options,
  className,
}: {
  heading: string
  options: ShippingOption[]
  className?: string
}) {
  return (
    <Reveal className={className}>
      <h2 className="label-sm text-ash">{heading}</h2>
      <dl className="mt-5 border-t border-line">
        {options.map((option) => (
          <div
            key={option.label}
            className="flex items-baseline justify-between gap-6 border-b border-line py-5"
          >
            <div className="min-w-0">
              <dt className="text-[0.95rem] leading-snug text-ink">{option.label}</dt>
              {option.note && (
                <span className="mt-1.5 block text-sm text-ash">{option.note}</span>
              )}
            </div>
            <dd className="shrink-0 text-sm text-fog">{option.price}</dd>
          </div>
        ))}
      </dl>
    </Reveal>
  )
}
