import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { BotIcon, Code2, Eye, FileSearch, Gauge, Lock, ShieldCheck } from 'lucide-react';

import ScanForm from '../components/aiReadiness/ScanForm';
import ResultHeader from '../components/aiReadiness/ResultHeader';
import CheckCard from '../components/aiReadiness/CheckCard';
import LeadGate from '../components/aiReadiness/LeadGate';
import AuditPanel from '../components/aiReadiness/AuditPanel';
import CompareSection from '../components/aiReadiness/CompareSection';
import ScopePanel from '../components/aiReadiness/ScopePanel';

import { AiReadinessError, compareScan, startScan, unlockScan } from '../services/aiReadinessService';
import type { ComparisonResult, FullScan, LeadInput, SiteType, TeaserScan } from '../types/aiReadiness';

/**
 * The whole flow, in one page, because it is genuinely one flow:
 *
 *   idle → teaser (grade + 2 checks) → unlocked (everything) → comparison
 *
 * The unlocked scan is the only place explanations and generated fixes exist —
 * the teaser response never contains them, so there is nothing here to reveal
 * early by accident.
 */
const AiReadiness: React.FC = () => {
  const [teaser, setTeaser] = useState<TeaserScan | null>(null);
  const [fullScan, setFullScan] = useState<FullScan | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [emailed, setEmailed] = useState<boolean | null>(null);

  const [scanning, setScanning] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [comparing, setComparing] = useState(false);

  const [scanError, setScanError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Kept so a re-classification can re-scan without the visitor retyping.
  const [lastUrl, setLastUrl] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const runScan = async (url: string, siteType?: SiteType): Promise<void> => {
    setScanning(true);
    setScanError(null);
    setLastUrl(url);
    // A new scan replaces everything: leaving the previous site's report on
    // screen under a new grade would be worse than a blank page.
    setTeaser(null);
    setFullScan(null);
    setComparison(null);
    setEmailed(null);

    try {
      setTeaser(await startScan(url, siteType));
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (error) {
      setScanError(messageOf(error));
    } finally {
      setScanning(false);
    }
  };

  /**
   * Re-run the same URL judged as a different kind of site. This drops the
   * unlocked report deliberately — the explanations were written for the old
   * classification, and showing them under a new one would be worse than
   * asking the visitor to unlock again.
   */
  const reclassify = (siteType: SiteType): void => {
    if (lastUrl) void runScan(lastUrl, siteType);
  };

  const runUnlock = async (lead: LeadInput): Promise<void> => {
    if (!teaser) return;
    setUnlocking(true);
    setUnlockError(null);

    try {
      const result = await unlockScan(teaser.scanId, lead);
      setFullScan(result.scan);
      setEmailed(result.emailed);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setUnlockError(messageOf(error));
    } finally {
      setUnlocking(false);
    }
  };

  /**
   * The homepage band hands the URL over in the query string rather than
   * scanning inline, so the result gets a full page rather than a cramped
   * strip. Run it once on arrival and drop the parameter, so a refresh or a
   * shared link does not silently re-scan someone else's site.
   */
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const handedOver = searchParams.get('url');
    if (!handedOver) return;
    setSearchParams({}, { replace: true });
    void runScan(handedOver);
    // Deliberately mount-only: this is a hand-off, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCompare = async (competitorUrl: string): Promise<void> => {
    if (!teaser) return;
    setComparing(true);
    setCompareError(null);

    try {
      setComparison(await compareScan(teaser.scanId, competitorUrl));
    } catch (error) {
      setCompareError(messageOf(error));
    } finally {
      setComparing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <Helmet>
        <title>Free AI Readiness Checker — Can ChatGPT Find Your Website? | Codenix Labs</title>
        <meta
          name="description"
          content="Free instant check: can ChatGPT, Claude, Gemini and Perplexity read, understand and recommend your website? Get an A–F score in 15 seconds, plus the exact code to fix what is broken."
        />
        <link rel="canonical" href="https://www.codenixlabs.com/ai-readiness" />
      </Helmet>

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden grid-bg">
        <div className="absolute inset-0 opacity-60 bg-glow" aria-hidden="true" />

        <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-semibold tracking-wider uppercase border rounded-full border-primary/40 bg-primary/10 text-primary"
            >
              <BotIcon size={14} aria-hidden="true" />
              Free · No signup to scan
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold leading-tight text-white font-orbitron sm:text-5xl lg:text-6xl"
            >
              Can AI assistants actually <span className="text-primary neon-text">find your website?</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="max-w-2xl mx-auto mt-6 text-lg leading-relaxed text-neutral-300"
            >
              More people ask ChatGPT, Claude, Gemini and Perplexity for recommendations than search for them. Paste your
              address and see whether those assistants can read, understand and recommend you — in about fifteen seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="max-w-2xl mx-auto mt-10"
            >
              <ScanForm onScan={runScan} busy={scanning} autoFocus={!teaser} />
              {scanError ? (
                <div className="px-4 py-3 mt-4 text-sm border rounded-xl border-error/30 bg-error/10 text-error" role="alert">
                  {scanError}
                </div>
              ) : null}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Results */}
      <div ref={resultsRef} className="scroll-mt-28">
        {teaser && !fullScan ? (
          <section className="relative py-12">
            <div className="container max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
              <ResultHeader
                domain={teaser.domain}
                grade={teaser.overallGrade}
                score={teaser.overallScore}
                summary={teaser.summary}
                siteType={teaser.siteType}
                confidence={teaser.siteTypeConfidence}
                overridden={teaser.siteTypeOverridden}
                audit={teaser.audit}
                partial={teaser.partial}
                cached={teaser.cached}
                onReclassify={reclassify}
                busy={scanning}
              />

              <div className="grid gap-4 mt-8">
                {teaser.teaserChecks.map((check, index) => (
                  <CheckCard
                    key={check.checkId}
                    variant="teaser"
                    index={index}
                    check={{
                      ...check,
                      pointsAwarded: 0,
                      pointsPossible: 0,
                      humanExplanation: null,
                      generatedFix: null,
                      generatedFixLanguage: null,
                      generatedFixTarget: null,
                    }}
                  />
                ))}

                {Array.from({ length: teaser.lockedChecks }).map((_, index) => (
                  <LockedPlaceholder key={index} />
                ))}
              </div>

              <div className="mt-10">
                <LeadGate
                  lockedChecks={teaser.lockedChecks}
                  fixesAvailable={teaser.fixesAvailable}
                  onSubmit={runUnlock}
                  busy={unlocking}
                  error={unlockError}
                />
              </div>

              <p className="mt-6 text-sm text-center text-neutral-500">
                Scanned in {(teaser.scanDurationMs / 1000).toFixed(1)} seconds.
              </p>
            </div>
          </section>
        ) : null}

        {fullScan ? (
          <FullReport
            scan={fullScan}
            emailed={emailed}
            cached={teaser?.cached}
            comparison={comparison}
            comparing={comparing}
            compareError={compareError}
            onCompare={runCompare}
            onReclassify={reclassify}
            busy={scanning}
          />
        ) : null}
      </div>

      {/*
        Both sit below the fold on the landing page only. Once a scan is
        running or finished, the results are what the visitor came for — the
        report carries its own compact version of the scope panel.
      */}
      {!teaser && !scanning ? (
        <>
          <Explainer />
          <ScopePanel />
        </>
      ) : null}
    </motion.div>
  );
};

const LockedPlaceholder: React.FC = () => (
  <div aria-hidden="true" className="flex items-center gap-4 p-6 border border-dashed rounded-2xl border-white/10 bg-white/[0.02]">
    <Lock size={18} className="flex-shrink-0 text-neutral-600" />
    <div className="flex-1 space-y-3">
      <div className="h-3 rounded w-2/5 bg-white/[0.06]" />
      <div className="h-2.5 rounded w-4/5 bg-white/[0.04]" />
    </div>
  </div>
);

const FullReport: React.FC<{
  scan: FullScan;
  emailed: boolean | null;
  cached?: boolean;
  comparison: ComparisonResult | null;
  comparing: boolean;
  compareError: string | null;
  onCompare: (url: string) => void;
  onReclassify: (siteType: SiteType) => void;
  busy: boolean;
}> = ({ scan, emailed, cached, comparison, comparing, compareError, onCompare, onReclassify, busy }) => {
  // Worst first. Within a status, the heavier check leads, so the most
  // expensive thing to fix is the first thing read.
  const order = { fail: 0, warning: 1, skipped: 2, pass: 3 } as const;
  const checks = [...scan.checks].sort((a, b) => order[a.status] - order[b.status] || b.pointsPossible - a.pointsPossible);

  return (
    <section className="relative py-12">
      <div className="container max-w-4xl px-4 mx-auto sm:px-6 lg:px-8">
        <ResultHeader
          domain={scan.domain}
          grade={scan.overallGrade}
          score={scan.overallScore}
          summary={scan.summary}
          siteType={scan.siteType}
          confidence={scan.siteTypeConfidence}
          overridden={scan.siteTypeOverridden}
          evidence={scan.siteTypeEvidence}
          audit={scan.audit}
          partial={scan.partial}
          cached={cached}
          onReclassify={onReclassify}
          busy={busy}
        />

        {emailed === false ? (
          <div className="px-5 py-4 mt-5 text-sm border rounded-2xl border-warning/30 bg-warning/10 text-warning">
            We could not email your report just now, but the full report is below and we have your details — nothing was lost.
          </div>
        ) : null}
        {emailed ? (
          <div className="px-5 py-4 mt-5 text-sm border rounded-2xl border-success/30 bg-success/10 text-success">
            A copy of this report is on its way to your inbox.
          </div>
        ) : null}

        <div className="grid gap-4 mt-8">
          {checks.map((check, index) => (
            <CheckCard key={check.checkId} check={check} variant="unlocked" index={index} />
          ))}
        </div>

        <div className="mt-8">
          <AuditPanel audit={scan.audit} checks={scan.checks} />
        </div>

        {/*
          Directly under the audit trail, before the call to action. The audit
          panel says how we scored what we looked at; this says what we looked
          at and what we left alone — which is the next question, and the one
          someone otherwise leaves the page still wondering about.
        */}
        <div className="mt-8">
          <ScopePanel variant="compact" />
        </div>

        <div className="mt-8">
          <CompareSection onCompare={onCompare} busy={comparing} error={compareError} result={comparison} />
        </div>

        <div className="p-6 mt-8 border rounded-2xl border-primary/30 bg-primary/5 sm:p-8">
          <h2 className="text-xl font-bold text-white font-orbitron sm:text-2xl">Want these fixed for you?</h2>
          <p className="mt-3 leading-relaxed text-neutral-300">
            Everything above is fixable, and most of it is a same-week job. We build the pages, the markup and the machine
            interfaces that let AI assistants describe you accurately — and we can do the parts that are not copy-paste.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 mt-6 font-semibold text-white transition-all duration-300 rounded-full bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
          >
            Talk to us about fixing it
          </Link>
        </div>

        <div className="mt-8 space-y-2 text-xs leading-relaxed text-neutral-500">
          <p>Pages checked: {scan.pagesScanned.length ? scan.pagesScanned.join(', ') : 'homepage only'}. Scanned in {(scan.scanDurationMs / 1000).toFixed(1)} seconds.</p>
          <p>
            This reflects what was publicly visible at {scan.domain} when we scanned it. Static HTML only — pages that build
            themselves with JavaScript are flagged for manual review rather than guessed at.
          </p>
        </div>
      </div>
    </section>
  );
};

const POINTS: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <BotIcon size={22} />,
    title: 'Can AI crawlers reach you at all?',
    body: 'We read your robots.txt — then actually request a page as GPTBot, ClaudeBot and PerplexityBot, because a firewall can refuse them while your robots.txt says "welcome".',
  },
  {
    icon: <Eye size={22} />,
    title: 'Is your content in the page, or built by JavaScript?',
    body: 'Most AI crawlers do not run JavaScript. If your product names and prices appear only after your code runs, they see an empty frame.',
  },
  {
    icon: <FileSearch size={22} />,
    title: 'Are your facts machine-readable?',
    body: 'Price and stock for a shop. Author and date for a blog. Address and opening hours for a clinic. We check the ones that matter for what you actually are.',
  },
  {
    icon: <Code2 size={22} />,
    title: 'And then we write the fix',
    body: 'Not "add Product schema" — an actual block with your own product name and price already in it, and a line telling you which file it goes in.',
  },
];

const Explainer: React.FC = () => (
  <section className="relative py-20">
    <div className="container max-w-5xl px-4 mx-auto sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto mb-14 text-center">
        <h2 className="text-3xl font-bold text-white font-orbitron sm:text-4xl">What we check</h2>
        <p className="mt-4 text-lg text-neutral-400">
          Seven checks, weighted for the kind of site you run — and we show you the weights.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {POINTS.map((point, index) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            className="p-7 glass rounded-2xl hover-effect"
          >
            <div className="flex items-center justify-center w-12 h-12 mb-5 rounded-xl bg-primary/15 text-primary">
              {point.icon}
            </div>
            <h3 className="text-lg font-bold text-white font-orbitron">{point.title}</h3>
            <p className="mt-3 leading-relaxed text-neutral-400">{point.body}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 p-6 mt-10 text-sm border sm:flex-row rounded-2xl border-accent/25 bg-accent/5 text-neutral-300">
        <ShieldCheck size={22} className="flex-shrink-0 text-accent" aria-hidden="true" />
        <p>
          <strong className="text-white">We show our working.</strong> Every score comes with the weight table, the rules
          version, how many pages we looked at, and what we could not check. Nothing on your site is scanned beyond your
          homepage and up to five of your main pages.
        </p>
      </div>

      <p className="flex items-center justify-center gap-2 mt-8 text-sm text-center text-neutral-500">
        <Gauge size={16} aria-hidden="true" />
        Free, no account needed. Most scans finish in under six seconds.
      </p>
    </div>
  </section>
);

function messageOf(error: unknown): string {
  if (error instanceof AiReadinessError) return error.message;
  return 'Something went wrong. Please try again.';
}

export default AiReadiness;
