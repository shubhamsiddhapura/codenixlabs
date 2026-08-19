import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

/**
 * What the scanner is doing, while it does it.
 *
 * A fifteen-second wait behind a single spinner reads as "stuck". The same wait
 * with the work named reads as thorough — and every line here is a real step
 * the engine performs, in the order it performs them, so this teaches the
 * method rather than merely filling time.
 *
 * The timings are the honest average shape of a scan rather than live progress:
 * the API returns one response at the end, so there is nothing to stream. They
 * are deliberately conservative — the last step holds until the real result
 * arrives, so the list never claims to have finished before it has.
 */
const STEPS: { label: string; detail: string; at: number }[] = [
  { label: 'Opening your homepage', detail: 'and following any redirects', at: 0 },
  { label: 'Reading your robots.txt', detail: 'the rules crawlers check first', at: 900 },
  { label: 'Looking for your sitemap', detail: 'to find pages worth checking', at: 1900 },
  { label: 'Working out what kind of site this is', detail: 'a shop is judged differently from a blog', at: 3000 },
  { label: 'Sampling pages from across your site', detail: 'one per section, not five from one corner', at: 4300 },
  { label: 'Asking again as GPTBot, ClaudeBot and PerplexityBot', detail: 'plus a Googlebot control', at: 6200 },
  { label: 'Checking your structured data', detail: 'the facts a machine can read without guessing', at: 8200 },
  { label: 'Scoring, and writing your fix code', detail: 'built from your own page', at: 10000 },
];

export const ScanProgress: React.FC<{ url?: string }> = ({ url }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => window.clearInterval(id);
  }, []);

  // The final step never self-completes. It stays active until the component
  // unmounts with the real result, so we never show a finished list while the
  // request is still in flight.
  const activeIndex = STEPS.reduce((current, step, index) => (elapsed >= step.at ? index : current), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-xl p-6 mx-auto text-left border rounded-2xl border-white/10 bg-surface/70 sm:p-7"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 pb-4 mb-5 border-b border-white/10">
        <Loader2 size={18} className="flex-shrink-0 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-white">
          Checking {url ? <span className="text-primary">{url}</span> : 'your site'}
        </p>
        <span className="ml-auto text-xs tabular-nums text-neutral-500">{(elapsed / 1000).toFixed(1)}s</span>
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;

          return (
            <li
              key={step.label}
              className={`flex items-start gap-3 transition-opacity duration-500 ${
                done || active ? 'opacity-100' : 'opacity-35'
              }`}
            >
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
                {done ? (
                  <Check size={16} className="text-success" aria-hidden="true" />
                ) : active ? (
                  <Loader2 size={15} className="animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" aria-hidden="true" />
                )}
              </span>

              <span className="min-w-0">
                <span className={`block text-sm leading-snug ${active ? 'font-semibold text-white' : 'text-neutral-300'}`}>
                  {step.label}
                </span>
                {active ? <span className="block mt-0.5 text-xs text-neutral-500">{step.detail}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="pt-4 mt-5 text-xs leading-relaxed border-t text-neutral-500 border-white/10">
        About twenty requests in under twenty seconds. Most of the wait is your server answering, not us thinking.
      </p>
    </motion.div>
  );
};

export default ScanProgress;
