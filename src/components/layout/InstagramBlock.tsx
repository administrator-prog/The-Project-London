import { Instagram, ArrowUpRight } from 'lucide-react'
import { PEARL_IMAGES, FLORENCE_IMAGES, sized } from '@/data/images'

const HANDLE = 'theprojectlondon'
const IG_URL = `https://instagram.com/${HANDLE}`

/**
 * Three frames from the shoot, alternating cool (studio) with warm
 * (campaign). Deliberately not the four the homepage collection run uses, so
 * the footer does not echo the section above it.
 */
const TILES = [FLORENCE_IMAGES[7], PEARL_IMAGES[5], FLORENCE_IMAGES[3]]

/**
 * The Instagram invitation, folded into the head of the footer: the handle
 * sits left, three frames right. The frames carry the same slow hover as the
 * collection grid on the homepage so the footer reads as part of the same
 * page rather than a strip bolted underneath it.
 */
export function InstagramBlock() {
  return (
    <div className="grid gap-10 md:grid-cols-12 md:items-end md:gap-8">
      <div className="md:col-span-4">
        <span className="label-sm text-ash">Instagram</span>

        <a
          href={IG_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-5 block font-serif text-[clamp(1.5rem,2.4vw,2.125rem)] leading-none text-ink"
        >
          <span className="link-underline">@{HANDLE}</span>
        </a>

        <a
          href={IG_URL}
          target="_blank"
          rel="noreferrer"
          className="group mt-6 inline-flex items-center gap-2.5 label-sm text-fog transition-colors duration-300 hover:text-ink"
        >
          <Instagram size={14} strokeWidth={1.5} />
          <span className="link-underline pb-0.5">Follow</span>
          <ArrowUpRight
            size={13}
            strokeWidth={1.5}
            className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-3 md:col-span-7 md:col-start-6 md:gap-4">
        {TILES.map((image) => (
          <a
            key={image}
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={`@${HANDLE} on Instagram`}
            className="group relative block aspect-square overflow-hidden bg-sand"
          >
            <img
              src={sized(image, 600)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-bone opacity-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-ink/30 group-hover:opacity-100">
              <Instagram size={18} strokeWidth={1.25} />
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
