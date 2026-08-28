import { Link } from 'react-router-dom'
import { footerLinks, socials } from '@/data/navigation'
import { Container } from '@/components/ui/Container'

/**
 * The page closes on a single quiet band: one hairline, the links in two
 * short rows, the studio opposite, the line of copyright beneath.
 *
 * Two pieces and three links do not need columns, headings, a wordmark or a
 * back-to-top control — the site is short enough to scroll. Everything here
 * is text on the same hairline the rest of the site uses.
 */
export function Footer() {
  return (
    <footer className="bg-bone text-ink">
      <Container className="border-t border-line py-14 md:py-16">
        <div className="flex flex-col gap-9 md:flex-row md:items-start md:justify-between md:gap-16">
          <nav className="flex flex-col gap-3.5" aria-label="Footer">
            <ul className="flex flex-wrap gap-x-7 gap-y-3.5">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className={linkClass}>
                    <span className="link-underline">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="flex flex-wrap gap-x-7 gap-y-3.5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className={linkClass}>
                    <span className="link-underline">{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-sm leading-relaxed text-fog md:text-right">
            London
            <br />
            United Kingdom
          </p>
        </div>

        <span className="mt-12 block label-sm text-ash md:mt-14">
          © {new Date().getFullYear()} The Project London
        </span>
      </Container>
    </footer>
  )
}

const linkClass = 'text-sm text-fog transition-colors duration-300 hover:text-ink'
