import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { EASE_OUT_EXPO } from '@/lib/motion'

/**
 * One open at a time, on the same hairline rows as the product page's
 * details. Nothing starts open — an FAQ that unfolds itself is a wall of text
 * pretending to be a list.
 */
export interface AccordionItem {
  question: string
  answer: string
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div>
      {items.map((item) => {
        const isOpen = open === item.question
        return (
          <div key={item.question} className="border-b border-line">
            <button
              onClick={() => setOpen(isOpen ? null : item.question)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-6 py-5 text-left"
            >
              <span className="text-[0.95rem] leading-snug text-ink">{item.question}</span>
              <span className="mt-0.5 shrink-0 text-ash">
                {isOpen ? <Minus size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl whitespace-pre-line pb-6 text-sm leading-relaxed text-fog">
                    {item.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
