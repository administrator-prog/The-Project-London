import { Link } from 'react-router-dom'
import { ArrowUp } from 'lucide-react'
import { footerColumns } from '@/data/navigation'
import { Container } from '@/components/ui/Container'
import { Logo } from '@/components/ui/Logo'

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/theprojectlondon' },
  { label: 'TikTok', href: 'https://tiktok.com' },
  { label: 'Pinterest', href: 'https://pinterest.com' },
  { label: 'Spotify', href: 'https://spotify.com' },
]

export function Footer() {
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <footer className="bg-bone text-ink">
      <Container className="pt-20 pb-10 md:pt-24">
        {/* Top — link columns + contact */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-12">
          {footerColumns.map((col) => (
            <div key={col.heading} className="md:col-span-2">
              <h3 className="label-sm mb-6 text-ash">{col.heading}</h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
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
          ))}

          <div className="col-span-2 md:col-span-3 md:col-start-10">
            <h3 className="label-sm mb-6 text-ash">Connect</h3>
            <ul className="mb-8 grid grid-cols-2 gap-3">
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
            <p className="text-sm leading-relaxed text-ash">
              Studio 04, Redchurch Street
              <br />
              London E2 · United Kingdom
            </p>
          </div>
        </div>

        {/* Oversized wordmark */}
        <div className="mt-24 flex justify-center border-t border-line pt-14">
          <Logo variant="stacked" />
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col-reverse items-start justify-between gap-8 border-t border-line pt-8 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="label-sm text-ash">
              © {new Date().getFullYear()} The Project London
            </span>
            {['Privacy', 'Terms', 'Cookies', 'Accessibility'].map((l) => (
              <Link
                key={l}
                to={`/${l.toLowerCase()}`}
                className="label-sm text-ash transition-colors hover:text-ink"
              >
                {l}
              </Link>
            ))}
          </div>

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
