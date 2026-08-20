import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lock, MinusCircle, XCircle } from 'lucide-react';
import FixBlock from './FixBlock';
import AgentAccessTable from './AgentAccessTable';
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
/**
 * One check, in one of two states.
 *
 * 'unlocked' — the fix code is present and rendered.
 * 'gated'    — everything except the code: verdict, reasoning, evidence, and a
 *              button where the code will go.
 *
 * There used to be a third state that showed nothing but a padlock, because the
 * gate sat in front of the whole report. It came out with the gate. A card that
 * says only "unlock to see what is wrong" gives a visitor no reason to believe
 * there is anything worth unlocking.
 */
export const CheckCard: React.FC<{
  check: ScanCheck;
  variant: 'unlocked' | 'gated';
  index?: number;
  /** Called when someone asks for the fix. Scrolls them to the form. */
  onUnlockFix?: () => void;
}> = ({ check, variant, index = 0, onUnlockFix }) => {
  const [showDetail, setShowDetail] = useState(false);
  const style = STATUS_STYLE[check.status];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="glass rounded-2xl p-6"
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
          <span className="hidden text-xs sm:inline text-neutral-500 whitespace-nowrap">{formatPoints(check)}</span>
        </div>
      </header>

      {check.humanExplanation ? (
        /*
         * Paragraphs, but no separate width cap.
         *
         * The reading measure is the card's job, not the paragraph's. Capping
         * the text at `max-w-prose` inside a wider card left a dead strip down
         * the right of every card — the text stopped well short of a border it
         * was clearly meant to meet. The report column is sized so that the
         * card's own content width already lands in a comfortable range.
         */
        <div className="mt-5 space-y-3.5">
          {toParagraphs(check.humanExplanation).map((paragraph, position) => (
            <p key={position} className="text-[17px] leading-[1.75] text-neutral-300">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {/* No explanation written for this check — fall back to the raw finding
          rather than showing an empty card. */}
      {!check.humanExplanation && check.details ? (
        <p className="mt-4 text-[17px] leading-[1.75] text-neutral-300">{check.details}</p>
      ) : null}

      {/*
        Shown in every variant, including the locked one. This is the evidence
        behind the verdict rather than advice about it — and a per-crawler table
        someone can check against their own server logs is the most persuasive
        thing on the page, so putting it behind the gate would be backwards.
      */}
      {check.agentAccess?.length ? <AgentAccessTable rows={check.agentAccess} /> : null}

      {check.generatedFix ? (
        <FixBlock code={check.generatedFix} language={check.generatedFixLanguage} target={check.generatedFixTarget} />
      ) : null}

      {/*
        Where the code would be, with a button instead.
        
        Deliberately shows the destination — "goes in your robots.txt" — so the
        offer is concrete. "Unlock the full report" asks someone to buy an
        envelope; "here is the file this changes" tells them what is inside.
      */}
      {variant === 'gated' && check.locked ? (
        <div className="p-5 mt-5 border rounded-2xl border-primary/25 bg-primary/[0.06]">
          <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-neutral-200">
            <Lock size={16} className="mt-1 flex-shrink-0 text-primary" aria-hidden="true" />
            <span>
              We generated the code that fixes this
              {check.generatedFixTarget ? (
                <>
                  {' '}— it goes in <span className="font-semibold text-white">{check.generatedFixTarget}</span>
                </>
              ) : null}
              . It is yours to keep, whether or not you ever talk to us.
            </span>
          </p>
          <button
            type="button"
            onClick={onUnlockFix}
            className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
          >
            Show me the fix
          </button>
        </div>
      ) : null}

      {check.humanExplanation && check.details ? (
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

/**
 * Split a long explanation into paragraphs at sentence boundaries.
 *
 * Two sentences per paragraph breaks the wall without chopping the argument
 * into fragments. Short explanations are returned untouched — a single
 * sentence in its own paragraph gains nothing.
 */
function toParagraphs(text: string, perParagraph = 2): string[] {
  // Split only where punctuation is followed by a space *and* a capital.
  // Punctuation alone cut "llms.txt lets every assistant…" into a fragment
  // starting "txt lets…" — the dot in a filename is not a full stop.
  const sentences = text.trim().split(/(?<=[.!?])\s+(?=["'“(]?[A-Z])/);
  if (sentences.length <= perParagraph) return [text.trim()];

  const out: string[] = [];
  for (let index = 0; index < sentences.length; index += perParagraph) {
    out.push(sentences.slice(index, index + perParagraph).join(' ').trim());
  }
  return out.filter(Boolean);
}

export default CheckCard;
