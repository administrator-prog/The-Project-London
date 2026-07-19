import { motion } from 'framer-motion'
import { Instagram, ArrowUpRight } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { MEDIA } from '@/data/images'
import { EASE_OUT_EXPO } from '@/lib/motion'

const HANDLE = 'theprojectlondon'
const IG_URL = `https://instagram.com/${HANDLE}`

/**
 * Latest-from-Instagram strip.
 *
 * Placeholder tiles for now — a static frontend can't read a live IG feed
 * without a token/backend. When ready, replace `posts` with the response from
 * the Instagram Basic Display API (or a service like Behold / EmbedSocial);
 * the markup stays the same (image + permalink per post).
 */
const posts = [
  { image: MEDIA.campaignFeature, position: '50% 26%' },
  { image: MEDIA.dressFeature1, position: '50% 34%' },
  { image: MEDIA.dressFeature2, position: '50% 30%' },
  { image: MEDIA.campaignFeature, position: '50% 58%' },
  { image: MEDIA.dressFeature1, position: '50% 64%' },
  { image: MEDIA.dressFeature2, position: '50% 62%' },
]

export function InstagramStrip() {
  return (
    <section className="bg-paper pt-16 pb-4 md:pt-20">
      <Container className="mb-8 flex items-end justify-between gap-4 md:mb-10">
        <div>
          <span className="label text-ash">Latest — Instagram</span>
          <a
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block w-fit font-serif text-2xl text-ink md:text-3xl"
          >
            <span className="link-underline">@{HANDLE}</span>
          </a>
        </div>
        <a
          href={IG_URL}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 label text-ink"
        >
          <Instagram size={16} strokeWidth={1.5} />
          <span className="link-underline pb-1">Follow</span>
          <ArrowUpRight
            size={14}
            strokeWidth={1.5}
            className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </a>
      </Container>

      <div className="grid grid-cols-3 gap-2 px-2 md:grid-cols-6 md:gap-2.5 md:px-2.5">
        {posts.map((post, i) => (
          <motion.a
            key={i}
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '0px 0px -6% 0px' }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: (i % 6) * 0.05 }}
            className="group relative aspect-square overflow-hidden bg-sand"
            aria-label={`@${HANDLE} on Instagram`}
          >
            <img
              src={post.image}
              alt=""
              loading="lazy"
              style={{ objectPosition: post.position }}
              className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-500 group-hover:bg-ink/25 group-hover:opacity-100">
              <Instagram size={22} strokeWidth={1.25} className="text-bone" />
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  )
}
