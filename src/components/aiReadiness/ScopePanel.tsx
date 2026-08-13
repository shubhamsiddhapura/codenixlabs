import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, HelpCircle, MinusCircle } from 'lucide-react';
import { COVERED, NOT_ANSWERED, NOT_CHECKED, SCOPE_SUMMARY, type ScopeItem } from '../../data/scopeOfChecks';

/**
 * What we check, what we skip, and what we cannot answer.
 *
 * Rendered two ways from one source. `full` is the landing-page version, read
 * before anyone scans; `compact` sits under a finished report and answers the
 * first question a knowledgeable reader has — "why is X not in here?" — at the
 * moment they think of it.
 *
 * The three columns are deliberately equal in weight. Burying the limitations
 * under the strengths would turn an argument for the tool back into the
 * marketing claim it exists to avoid.
 */

type Variant = 'full' | 'compact';

const COLUMNS: { key: string; heading: string; note: string; items: ScopeItem[]; icon: React.ReactNode; tone: string }[] = [
  {
    key: 'covered',
    heading: 'What we check',
    note: 'Twelve points, weighted for the kind of site you run.',
    items: COVERED,
    icon: <CheckCircle2 size={18} />,
    tone: 'text-success',
  },
  {
    key: 'skipped',
    heading: 'What we skip, on purpose',
    note: 'Each one for a reason we will defend.',
    items: NOT_CHECKED,
    icon: <MinusCircle size={18} />,
    tone: 'text-warning',
  },
  {
    key: 'unanswered',
    heading: 'What this cannot tell you',
    note: 'The limits of the question itself.',
    items: NOT_ANSWERED,
    icon: <HelpCircle size={18} />,
    tone: 'text-secondary',
  },
];

export const ScopePanel: React.FC<{ variant?: Variant }> = ({ variant = 'full' }) => {
  // Under a report the section starts closed: someone reading their own results
  // should not have to scroll past three columns of methodology to reach the
  // call to action. On the landing page it is the content, so it is open.
  const [open, setOpen] = useState(variant === 'full');

  if (variant === 'compact') {
    return (
      <div className="overflow-hidden border rounded-2xl border-white/10 bg-surface/60">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center justify-between w-full gap-4 px-5 py-4 text-left transition-colors sm:px-6 hover:bg-white/5"
        >
          <span>
            <span className="block font-semibold text-white">What we checked — and what we did not</span>
            <span className="block mt-1 text-sm text-neutral-400">{SCOPE_SUMMARY}</span>
          </span>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className={`flex-shrink-0 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open ? (
          <div className="grid gap-6 px-5 pb-6 sm:px-6 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.key}>
                <h3 className={`flex items-center gap-2 text-sm font-bold ${column.tone}`}>
                  {column.icon}
                  {column.heading}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {column.items.map((item) => (
                    <li key={item.title} className="text-sm leading-relaxed text-neutral-300">
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="relative py-20">
      <div className="container max-w-6xl px-4 mx-auto sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-3xl font-bold text-white font-orbitron sm:text-4xl">Exactly what this covers</h2>
          <p className="mt-4 text-lg text-neutral-400">{SCOPE_SUMMARY}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {COLUMNS.map((column, columnIndex) => (
            <motion.div
              key={column.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: columnIndex * 0.1 }}
              className="p-6 glass rounded-2xl sm:p-7"
            >
              <h3 className={`flex items-center gap-2 text-lg font-bold font-orbitron ${column.tone}`}>
                {column.icon}
                {column.heading}
              </h3>
              <p className="mt-2 text-sm text-neutral-500">{column.note}</p>

              <ul className="mt-6 space-y-5">
                {column.items.map((item) => (
                  <li key={item.title}>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{item.body}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <p className="max-w-3xl mx-auto mt-12 text-sm leading-relaxed text-center text-neutral-500">
          Most tools list only the first column. The second and third are the ones worth reading — a score is only worth
          something if you know what went into it and what was left out.
        </p>
      </div>
    </section>
  );
};

export default ScopePanel;
