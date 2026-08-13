import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lock, MinusCircle, XCircle } from 'lucide-react';
import FixBlock from './FixBlock';
import { STATUS_STYLE, type CheckStatus, type ScanCheck } from '../../types/aiReadiness';

const ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 size={20} className="text-success" aria-hidden="true" />,
  warning: <AlertTriangle size={20} className="text-warning" aria-hidden="true" />,
  fail: <XCircle size={20} className="text-error" aria-hidden="true" />,
  skipped: <MinusCircle size={20} className="text-neutral-400" aria-hidden="true" />,
};

/**
 * One check in the report. Three states, and the difference matters:
 *
 *   unlocked — verdict, plain-English explanation, and the generated fix
 *   teaser   — verdict and the technical detail, no explanation (the free look)
 *   locked   — verdict only, with the reason to unlock stated on the card
 */
export const CheckCard: React.FC<{ check: ScanCheck; variant: 'unlocked' | 'teaser' | 'locked'; index?: number }> = ({
  check,
  variant,
  index = 0,
}) => {
  const [showDetail, setShowDetail] = useState(false);
  const style = STATUS_STYLE[check.status];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className={`glass rounded-2xl p-6 ${variant === 'locked' ? 'opacity-70' : ''}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5">{ICON[check.status]}</span>
          <h3 className="text-base font-bold leading-snug text-white font-orbitron sm:text-lg">{check.title}</h3>
        </div>

        <div className="flex items-center flex-shrink-0 gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${style.bg} ${style.text} ${style.ring}`}
          >
            {style.label}
          </span>
          {variant === 'teaser' ? null : (
            <span className="hidden text-xs sm:inline text-neutral-500 whitespace-nowrap">{formatPoints(check)}</span>
          )}
        </div>
      </header>

      {variant === 'unlocked' && check.humanExplanation ? (
        <p className="mt-4 leading-relaxed text-neutral-300">{check.humanExplanation}</p>
      ) : null}

      {variant === 'teaser' ? <p className="mt-4 leading-relaxed text-neutral-300">{check.details}</p> : null}

      {variant === 'locked' ? (
        <p className="flex items-start gap-2 mt-4 text-neutral-400">
          <Lock size={16} className="mt-1 flex-shrink-0 text-primary" aria-hidden="true" />
          {check.generatedFixLanguage
            ? 'Unlock to see what is wrong, why it costs you, and the code that fixes it.'
            : 'Unlock to see what is wrong and why it costs you.'}
        </p>
      ) : null}

      {variant === 'unlocked' && check.generatedFix ? (
        <FixBlock code={check.generatedFix} language={check.generatedFixLanguage} target={check.generatedFixTarget} />
      ) : null}

      {variant === 'unlocked' && check.details ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDetail((open) => !open)}
            className="text-xs underline transition-colors text-neutral-500 hover:text-neutral-300"
          >
            {showDetail ? 'Hide technical detail' : 'Show technical detail'}
          </button>
          {showDetail ? (
            <p className="mt-2 text-xs leading-relaxed break-words text-neutral-500">{check.details}</p>
          ) : null}
        </div>
      ) : null}
    </motion.article>
  );
};

/**
 * A skipped check scores 0/0, which reads as a failure. Say what actually
 * happened instead — those are normalised out of the score rather than counted
 * against the site, and the card should not imply otherwise.
 */
function formatPoints(check: ScanCheck): string {
  if (check.status === 'skipped') return 'not scored';
  return `${check.pointsAwarded}/${check.pointsPossible} pts`;
}

export default CheckCard;
