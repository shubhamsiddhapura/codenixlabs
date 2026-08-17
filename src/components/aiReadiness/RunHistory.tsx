import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe2, History, Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { fetchRunComparison, fetchScanHistory } from '../../services/aiReadinessService';
import { GRADE_COLOUR, STATUS_STYLE, type CheckChange, type RunComparison, type RunSummary } from '../../types/aiReadiness';

/**
 * Earlier runs of this site, and what changed between two of them.
 *
 * This is the question a single scan can never answer: *when did it break?* A
 * theme update or a new security plugin can shut AI crawlers out on a Tuesday
 * and nothing tells the owner — the site still looks right, and crawlers do not
 * complain, they just stop coming. Two runs side by side turns that from a
 * discovery months later into one someone makes in days.
 *
 * Nothing new is measured to build this. Every scan has always been stored with
 * its timestamp and rule version; this reads back what was already there.
 */
const CHANGE_STYLE: Record<CheckChange, { icon: React.ReactNode; text: string; label: string }> = {
  regressed: { icon: <TrendingDown size={15} aria-hidden="true" />, text: 'text-error', label: 'Got worse' },
  improved: { icon: <TrendingUp size={15} aria-hidden="true" />, text: 'text-success', label: 'Improved' },
  appeared: { icon: <ArrowRight size={15} aria-hidden="true" />, text: 'text-secondary', label: 'New check' },
  disappeared: { icon: <Minus size={15} aria-hidden="true" />, text: 'text-neutral-500', label: 'No longer run' },
  unchanged: { icon: <Minus size={15} aria-hidden="true" />, text: 'text-neutral-500', label: 'Unchanged' },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const RunHistory: React.FC<{ scanId: string }> = ({ scanId }) => {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [comparison, setComparison] = useState<RunComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchScanHistory(scanId)
      .then((history) => {
        if (live) setRuns(history.runs);
      })
      // A missing history is not worth an error message on someone's report —
      // the panel simply does not appear.
      .catch(() => {
        if (live) setRuns([]);
      });
    return () => {
      live = false;
    };
  }, [scanId]);

  // Nothing to compare against yet. Most first-time visitors land here, and an
  // empty "history" box would be noise on the one report they came for.
  if (!runs?.length) return null;

  const compare = async (otherScanId: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setComparison(await fetchRunComparison(scanId, otherScanId));
    } catch {
      setError('We could not load that comparison. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 border rounded-2xl border-white/10 bg-surface/60 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white font-orbitron">
        <History size={18} className="text-secondary" aria-hidden="true" />
        Earlier scans of this site
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-400">
        {runs.length} earlier {runs.length === 1 ? 'run' : 'runs'} on record. Pick one to see what moved — this is how a
        change that quietly shut crawlers out shows up in days rather than months.
      </p>

      <ul className="mt-5 space-y-2">
        {runs.map((run) => (
          <li
            key={run.scanId}
            className="flex flex-wrap items-center gap-3 px-4 py-3 border rounded-xl border-white/10 bg-white/[0.02]"
          >
            {/*
              A run that found no website is stored as grade F, score 0, because
              the columns have to hold something. Rendering that as a red F would
              tell someone whose site was down for ten minutes that it scored
              zero — a verdict the scan deliberately refused to give. These rows
              say what actually happened, and offer no comparison, because there
              is nothing in them to compare.
            */}
            {run.noWebsite ? (
              <>
                <span className="flex items-center justify-center flex-shrink-0 rounded-lg h-9 w-9 bg-white/5 text-neutral-500">
                  <Globe2 size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{formatDate(run.scannedAt)}</span>
                  <span className="block text-xs text-neutral-500">No site reachable · not scored</span>
                </span>
              </>
            ) : (
              <>
                <span
                  className="flex items-center justify-center flex-shrink-0 text-sm font-bold rounded-lg h-9 w-9"
                  style={{ backgroundColor: `${GRADE_COLOUR[run.overallGrade]}22`, color: GRADE_COLOUR[run.overallGrade] }}
                >
                  {run.overallGrade}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{formatDate(run.scannedAt)}</span>
                  <span className="block text-xs text-neutral-500">
                    {run.overallScore}/100 · rules v{run.scoringVersion}
                    {run.partial ? ' · partial scan' : ''}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => void compare(run.scanId)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 ml-auto text-xs font-semibold transition-colors border rounded-lg border-white/15 text-neutral-200 hover:bg-white/10 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                  Compare with now
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {error ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {comparison ? <ComparisonTable comparison={comparison} /> : null}
    </div>
  );
};

const ComparisonTable: React.FC<{ comparison: RunComparison }> = ({ comparison }) => {
  const moved = comparison.checks.filter((check) => check.change !== 'unchanged');

  return (
    <div className="pt-6 mt-6 border-t border-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-neutral-400">
          {formatDate(comparison.before.scannedAt)} <ArrowRight size={13} className="inline mx-1" aria-hidden="true" />{' '}
          {formatDate(comparison.after.scannedAt)}
        </span>

        {/*
          The score delta appears only when the two runs used the same rules.
          We have changed the weights several times; a confident "+12" spanning
          a version boundary would be reporting our own edits as the site's
          progress.
        */}
        {comparison.comparable && comparison.scoreDelta !== null ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              comparison.scoreDelta > 0
                ? 'bg-success/15 text-success'
                : comparison.scoreDelta < 0
                  ? 'bg-error/15 text-error'
                  : 'bg-white/5 text-neutral-400'
            }`}
          >
            {comparison.scoreDelta > 0 ? '+' : ''}
            {comparison.scoreDelta} points
          </span>
        ) : null}
      </div>

      {comparison.incomparableReason ? (
        <p className="px-4 py-3 mt-3 text-sm leading-relaxed border rounded-xl border-warning/30 bg-warning/10 text-warning">
          {comparison.incomparableReason}
        </p>
      ) : null}

      {moved.length ? (
        <ul className="mt-4 space-y-2">
          {moved.map((check) => {
            const style = CHANGE_STYLE[check.change];
            return (
              <li key={check.checkId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 rounded-xl bg-white/[0.03]">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
                  {style.icon}
                  {style.label}
                </span>
                <span className="text-sm text-neutral-200">{check.title}</span>
                <span className="ml-auto text-xs text-neutral-500">
                  {check.before ? STATUS_STYLE[check.before.status].label : '—'} →{' '}
                  {check.after ? STATUS_STYLE[check.after.status].label : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      ) : comparison.checks.length ? (
        <p className="mt-4 text-sm text-neutral-400">
          Nothing changed between these two runs — every check landed on the same verdict.
        </p>
      ) : null}
      {/*
        The empty-checks case is not the same as the nothing-moved case. A
        comparison against a run that found no website returns no checks at all,
        and "nothing changed — every check landed on the same verdict" would be
        a reassuring sentence about a comparison that never happened. The reason
        above says what did.
      */}
    </div>
  );
};

export default RunHistory;
