import { Link } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { footerLinks, socials } from '@/data/navigation'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'
import { InstagramBlock } from './InstagramBlock'

/**
 * The footer opens on Instagram — image-led, so the page ends the way it ran
 * — then steps down through the link columns to the wordmark and the bottom
 * bar. Two hairlines only: the page should close quietly, not in boxes.
 */
export function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer className="bg-bone text-ink">
      <Container className="pt-16 pb-10 md:pt-20">
        <InstagramBlock />

        {/* Links */}
        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 border-t border-line pt-14 md:grid-cols-12 md:mt-20">
          <div className="md:col-span-3">
            <h3 className="label-sm mb-6 text-ash">The Collection</h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-fog transition-colors duration-300 hover:text-ink"
                  >
                    <span className="link-underline">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 md:col-start-6">
            <h3 className="label-sm mb-6 text-ash">Connect</h3>
            <ul className="space-y-3">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-fog transition-colors duration-300 hover:text-ink"
                  >
                    <span className="link-underline">{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3 md:col-start-10">
            <h3 className="label-sm mb-6 text-ash">Studio</h3>
            <p className="text-sm leading-relaxed text-fog">
              London
              <br />
              United Kingdom
            </p>
          </div>
        </div>

        {/* Wordmark */}
        <div className="mt-20 flex justify-center md:mt-24">
          <Logo variant="stacked" />
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col-reverse items-start justify-between gap-8 border-t border-line pt-8 md:flex-row md:items-center md:mt-20">
          <span className="label-sm text-ash">
            © {new Date().getFullYear()} The Project London
          </span>

          <button
            onClick={scrollTop}
            className="group flex items-center gap-2 label-sm text-fog transition-colors hover:text-ink"
          >
            Back to top
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors duration-300 group-hover:border-ink">
              <ArrowUp size={14} strokeWidth={1.5} className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5" />
            </span>
          </button>
        </div>
      </Container>
    </footer>
  )
}
