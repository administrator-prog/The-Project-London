import { Instagram, ArrowUpRight } from 'lucide-react'
import { Container } from '@/components/ui/Container'

const HANDLE = 'theprojectlondon'
const IG_URL = `https://instagram.com/${HANDLE}`

/** Quiet Instagram call-to-action — no embedded feed, just the follow link. */
export function InstagramStrip() {
  return (
    <section className="bg-paper py-20 md:py-28">
      <Container className="flex flex-col items-center text-center">
        <span className="label text-ash">Instagram</span>

        <a
          href={IG_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block font-serif text-3xl text-ink md:text-4xl"
        >
          <span className="link-underline">@{HANDLE}</span>
        </a>

        <a
          href={IG_URL}
          target="_blank"
          rel="noreferrer"
          className="group mt-8 inline-flex h-12 items-center justify-center gap-2.5 border border-ink/25 px-7 font-display text-[0.6875rem] font-medium tracking-[0.16em] whitespace-nowrap text-ink uppercase transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink hover:bg-ink hover:text-bone"
        >
          <Instagram size={15} strokeWidth={1.5} />
          Follow
          <ArrowUpRight
            size={14}
            strokeWidth={1.5}
            className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </Container>
    </section>
  )
}
