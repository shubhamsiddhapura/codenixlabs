import React, { useState } from 'react';
import { ChevronDown, ScrollText } from 'lucide-react';
import type { AuditTrail, CheckId, ScanCheck } from '../../types/aiReadiness';

const CHECK_LABEL: Record<CheckId, string> = {
  bot_access: 'AI bot access',
  agent_interface: 'Agent interface',
  structured_data: 'Structured data',
  content_structure: 'Page structure & metadata',
  trust_signals: 'Trust & identity pages',
  meta_robots: 'Indexability',
  crawlability: 'Crawlability',
};

/**
 * How this score was produced.
 *
 * Every tool in this space hands you a number out of 100 and none of them shows
 * its working, which is exactly why four of them can disagree wildly about one
 * site. Our number is not more objective than theirs — it is just auditable.
 *
 * Collapsed by default: this is the answer to "why should I believe this",
 * not something a visitor needs before reading their findings.
 */
export const AuditPanel: React.FC<{ audit: AuditTrail; checks: ScanCheck[] }> = ({ audit, checks }) => {
  const [open, setOpen] = useState(false);

  const skipped = checks.filter((check) => check.status === 'skipped');
  const scoredOutOf = checks.reduce((sum, check) => sum + check.pointsPossible, 0);

  return (
    <div className="glass rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex items-center justify-between w-full gap-3 p-5 text-left transition-colors hover:bg-white/5 rounded-2xl"
      >
        <span className="inline-flex items-center gap-2 font-semibold text-white">
          <ScrollText size={18} className="text-accent" aria-hidden="true" />
          How this score was calculated
        </span>
        <ChevronDown size={20} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="grid gap-5 px-5 pb-6">
          <Row label="Scoring rules">
            version {audit.scoringVersion} — scores are only comparable between scans on the same version
          </Row>

          <Row label="Pages checked">
            {audit.pagesChecked} of {Math.max(audit.pagesDiscovered + 1, audit.pagesChecked)} we found, sampled across
            different sections of the site rather than taken in order
          </Row>

          <Row label="Method">{audit.method}</Row>

          {skipped.length ? (
            <Row label="Left out of the score">
              {skipped.map((check) => check.title).join(', ')} — scored 0 out of 0, so the total is {scoredOutOf} points
              rather than 100 and the percentage is taken over what was actually checked
            </Row>
          ) : null}

          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-200">What each check was worth for this kind of site</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(audit.weights) as CheckId[]).map((checkId) => (
                <li key={checkId} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-neutral-300">{CHECK_LABEL[checkId]}</span>
                  <span className="flex-shrink-0 tabular-nums text-neutral-500">
                    {audit.weights[checkId] === 0 ? 'not scored' : `${audit.weights[checkId]} pts`}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs leading-relaxed text-neutral-500">
              These weights are our judgement about what matters most for this kind of site — nobody has published data
              linking these signals to being cited by an assistant, so treat the number as a ranking of what to fix first,
              not a measurement.{' '}
              {audit.blockingIssues > 0
                ? 'The blockers flagged above are the part that carries no judgement at all: a crawler that is disallowed, a page that does not load, or a page marked noindex is invisible however you weight it.'
                : 'You have no hard blockers — nothing on your site is invisible to a crawler outright.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-sm font-semibold text-neutral-200">{label}</p>
    <p className="mt-1 text-sm leading-relaxed text-neutral-400">{children}</p>
  </div>
);

export default AuditPanel;
