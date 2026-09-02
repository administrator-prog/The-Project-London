import { Link } from 'react-router-dom'
import { footerColumns } from '@/data/navigation'
import { Container } from '@/components/ui/Container'

/**
 * The page closes on four short columns — a tracked heading over a stack of
 * links — and a bottom rule carrying the studio and the line of copyright.
 *
 * The columns keep every link on its own line at every width, so nothing
 * wraps into the row beside it. No wordmark, no back-to-top: the site is
 * short enough to scroll, and the hairlines are the ones used throughout.
 */
export function Footer() {
  return (
    <footer className="bg-bone text-ink">
      <Container className="border-t border-line py-14 md:py-16">
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
        >
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h2 className="label-sm text-ash">{column.heading}</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {!link.href ? (
                      <span className={`${linkClass} cursor-default`}>{link.label}</span>
                    ) : link.external ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                        <span className="link-underline">{link.label}</span>
                      </a>
                    ) : (
                      <Link to={link.href} className={linkClass}>
                        <span className="link-underline">{link.label}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-7 label-sm text-ash sm:flex-row sm:items-center sm:justify-between md:mt-16">
          <span>© {new Date().getFullYear()} The Project London</span>
          <span>London, United Kingdom</span>
        </div>
      </Container>
    </footer>
  )
}

const linkClass = 'inline-block text-sm text-fog transition-colors duration-300 hover:text-ink'
