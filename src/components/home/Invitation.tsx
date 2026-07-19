import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { Reveal, TextReveal } from '@/components/ui/Reveal'
import { invitation } from '@/data/home'
import { EASE_OUT_EXPO } from '@/lib/motion'

export function Invitation() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setSubmitted(true)
  }

  return (
    <section className="flex min-h-[92svh] items-center bg-bone py-28 text-ink">
      <Container className="text-center">
        <Reveal className="mb-8">
          <span className="label text-ash">{invitation.eyebrow}</span>
        </Reveal>

        <h2 className="mx-auto max-w-[16ch] text-display font-serif font-medium text-ink">
          <TextReveal text={invitation.line} />
        </h2>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-8 max-w-md text-[0.95rem] leading-relaxed text-fog">
            {invitation.body}
          </p>
        </Reveal>

        <Reveal delay={0.22}>
          <div className="relative mx-auto mt-12 h-14 max-w-md">
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  className="group relative flex items-center border-b border-ink/30 transition-colors focus-within:border-ink"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-14 w-full bg-transparent pr-12 text-center text-base text-ink placeholder:text-ash focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Join"
                    className="absolute right-0 flex h-10 w-10 items-center justify-center text-ink transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1"
                  >
                    <ArrowRight size={20} strokeWidth={1.5} />
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                  className="flex h-14 items-center justify-center gap-3 border-b border-ink text-ink"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-bone">
                    <Check size={15} strokeWidth={2} />
                  </span>
                  <span className="text-base">Welcome to the Project.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <p className="mt-6 text-xs text-ash">
            By subscribing you agree to our Privacy Policy. Unsubscribe anytime.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
