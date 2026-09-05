import { Reveal } from './Reveal'
import type { PolicyBlock } from '@/data/policies'

/**
 * A stack of policy blocks at reading width.
 *
 * Email addresses inside the copy are turned into links on the way out — they
 * are the one thing on these pages a visitor is actually meant to act on, and
 * asking someone to retype an address by hand is a small, avoidable rudeness.
 */
export function Prose({ blocks }: { blocks: PolicyBlock[] }) {
  return (
    <div className="max-w-2xl">
      {blocks.map((block, i) => (
        <Reveal key={block.heading ?? i} delay={0.05 * i} className={i > 0 ? 'mt-12' : ''}>
          {block.heading && (
            <h2 className="label-sm mb-5 text-ash">{block.heading}</h2>
          )}
          {block.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-4 text-[0.95rem] leading-relaxed text-fog first:mt-0"
            >
              {linkEmails(paragraph)}
            </p>
          ))}
        </Reveal>
      ))}
    </div>
  )
}

/*
 * Two regexes for one pattern, deliberately. `split` needs the capture group
 * to keep the address in the output; the test must not carry the /g flag,
 * because a global regex remembers lastIndex between calls and would start
 * matching from halfway through the next string.
 */
const EMAIL_SPLIT = /([\w.+-]+@[\w-]+\.[\w.]+)/g
const IS_EMAIL = /^[\w.+-]+@[\w-]+\.[\w.]+$/

function linkEmails(text: string) {
  return text.split(EMAIL_SPLIT).map((part, i) =>
    IS_EMAIL.test(part) ? (
      <a key={i} href={`mailto:${part}`} className="text-ink link-underline">
        {part}
      </a>
    ) : (
      part
    ),
  )
}
