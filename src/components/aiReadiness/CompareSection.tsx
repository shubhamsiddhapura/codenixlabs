import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import ScanForm from './ScanForm';
import GradeRing from './GradeRing';
import { STATUS_STYLE, type ComparisonResult, type FullScan } from '../../types/aiReadiness';

/**
 * A one-off, private comparison against a single competitor. No leaderboard,
 * nothing published — the same scan engine run a second time and rendered in
 * two columns.
 */
export const CompareSection: React.FC<{
  onCompare: (url: string) => void;
  busy: boolean;
  error: string | null;
  result: ComparisonResult | null;
}> = ({ onCompare, busy, error, result }) => {
  const [open, setOpen] = useState(false);

  if (result) return <ComparisonTable result={result} />;

  return (
    <div className="p-6 border border-dashed glass rounded-2xl border-white/15 sm:p-8">
      <h2 className="inline-flex items-center gap-2 text-xl font-bold text-white font-orbitron">
        <Swords size={20} className="text-accent" aria-hidden="true" />
        Want to see how you compare?
      </h2>
      <p className="mt-3 leading-relaxed text-neutral-300">
        Paste a competitor&rsquo;s address and we will run the same checks against them, side by side with yours.
      </p>

      <div className="mt-6">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-6 py-3 font-semibold text-white transition-colors border rounded-full border-white/20 bg-white/5 hover:bg-white/10"
          >
            Compare against a competitor
          </button>
        ) : (
          <>
            <ScanForm onScan={onCompare} busy={busy} autoFocus placeholder="competitor.com" submitLabel="Run comparison" variant="compact" />
            {error ? (
              <div className="px-4 py-3 mt-4 text-sm border rounded-xl border-error/30 bg-error/10 text-error" role="alert">
                {error}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

const ComparisonTable: React.FC<{ result: ComparisonResult }> = ({ result }) => {
  const { yourScan, competitorScan } = result;

  // Align on checkId rather than array position: relying on order would
  // silently pair the wrong rows the moment a check is skipped on one side.
  const rows = yourScan.checks.map((check) => ({
    check,
    theirs: competitorScan.checks.find((candidate) => candidate.checkId === check.checkId) || null,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="p-6 glass rounded-2xl sm:p-8">
      <h2 className="text-xl font-bold text-white font-orbitron sm:text-2xl">You vs {competitorScan.domain}</h2>

      {yourScan.siteType !== competitorScan.siteType ? (
        <div className="px-5 py-4 mt-4 text-sm leading-relaxed border rounded-2xl border-warning/30 bg-warning/10 text-warning">
          We classified these as different kinds of site, so they were judged against different expectations. The
          check-by-check comparison still holds, but the overall scores are not strictly like-for-like.
        </div>
      ) : null}

      <div className="grid gap-6 mt-8 sm:grid-cols-2">
        <ScoreColumn label="You" scan={yourScan} />
        <ScoreColumn label="Them" scan={competitorScan} />
      </div>

      <div className="mt-8 -mx-2 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-2 py-3 text-xs font-semibold text-left uppercase text-neutral-400">Check</th>
              <th className="px-2 py-3 text-xs font-semibold text-center uppercase text-neutral-400">You</th>
              <th className="px-2 py-3 text-xs font-semibold text-center uppercase text-neutral-400 break-all">
                {competitorScan.domain}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ check, theirs }) => (
              <tr key={check.checkId} className="border-b border-white/5">
                <td className="px-2 py-4 text-sm text-neutral-300">{check.title}</td>
                <td className="px-2 py-4 text-center">
                  <Pill status={check.status} />
                </td>
                <td className="px-2 py-4 text-center">
                  {theirs ? <Pill status={theirs.status} /> : <span className="text-neutral-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-neutral-500">
        This comparison is private to you. We do not publish it or keep a public ranking of anyone&rsquo;s site.
      </p>
    </motion.div>
  );
};

const Pill: React.FC<{ status: keyof typeof STATUS_STYLE }> = ({ status }) => {
  const style = STATUS_STYLE[status];
  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${style.bg} ${style.text} ${style.ring}`}>
      {style.label}
    </span>
  );
};

const ScoreColumn: React.FC<{ label: string; scan: FullScan }> = ({ label, scan }) => (
  <div className="flex items-center gap-4">
    <GradeRing grade={scan.overallGrade} score={scan.overallScore} size={84} />
    <div className="min-w-0">
      <p className="text-xs tracking-wider uppercase text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white font-orbitron">{scan.overallScore}/100</p>
      <p className="text-xs truncate text-neutral-500">{scan.domain}</p>
    </div>
  </div>
);

export default CompareSection;
