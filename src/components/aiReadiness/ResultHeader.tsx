import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, Info } from 'lucide-react';
import GradeRing from './GradeRing';
import { SITE_TYPE_LABEL, type AuditTrail, type Confidence, type Grade, type SiteType } from '../../types/aiReadiness';

const OVERRIDE_OPTIONS: SiteType[] = ['ecommerce', 'content', 'saas', 'local_business', 'general'];

const withArticle = (noun: string): string => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;

/**
 * Grade, score, summary — plus what we decided the site *is*, and a way to
 * correct that.
 *
 * The site type is stated up front on purpose. Every expectation in the report
 * follows from that one call, so if it is wrong the reader needs to know before
 * they act on the findings. Saying "the signals were weak" and leaving it there
 * is half the job; they also have to be able to fix it.
 */
export const ResultHeader: React.FC<{
  domain: string;
  grade: Grade;
  score: number;
  summary: string;
  siteType: SiteType;
  confidence: Confidence;
  overridden: boolean;
  evidence?: string[];
  audit: AuditTrail;
  partial: boolean;
  cached?: boolean;
  onReclassify?: (siteType: SiteType) => void;
  busy?: boolean;
}> = ({ domain, grade, score, summary, siteType, confidence, overridden, evidence, audit, partial, cached, onReclassify, busy }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <div className="flex flex-col items-center gap-8 p-6 text-center glass rounded-3xl sm:flex-row sm:p-9 sm:text-left">
      <GradeRing grade={grade} score={score} />

      <div className="flex-1 min-w-0">
        <p className="text-sm break-all text-neutral-400">{domain}</p>
        <h2 className="mt-2 text-2xl font-bold text-white font-orbitron sm:text-3xl">Your AI Readiness score</h2>
        <p className="mt-3 text-lg leading-relaxed text-neutral-300">{summary}</p>
      </div>
    </div>

    <div className="grid gap-3 mt-5">
      {audit.blockingIssues > 0 ? (
        <Notice tone="error" icon={<AlertOctagon size={18} aria-hidden="true" />} title={`${audit.blockingIssues} hard blocker${audit.blockingIssues === 1 ? '' : 's'}`}>
          {audit.blockingIssues === 1 ? 'One check' : `${audit.blockingIssues} checks`} below {audit.blockingIssues === 1 ? 'is' : 'are'} not a
          matter of degree: {audit.blockingIssues === 1 ? 'it means' : 'they mean'} an AI assistant currently cannot reach or read
          your site at all. Whatever you make of the score, fix {audit.blockingIssues === 1 ? 'that one' : 'those'} first.
        </Notice>
      ) : null}

      <SiteTypeNotice
        siteType={siteType}
        confidence={confidence}
        overridden={overridden}
        evidence={evidence}
        onReclassify={onReclassify}
        busy={busy}
      />

      {audit.renderMode === 'empty_shell' ? (
        <Notice tone="warning" title="Needs manual review">
          Your pages arrive as an empty frame — the content is fetched afterwards by JavaScript, which most AI crawlers cannot
          run. Anything we could not read has been left out of your score rather than counted against you.
        </Notice>
      ) : null}

      {audit.renderMode === 'payload_only' ? (
        <Notice tone="warning" title="Content is in the response, but not as markup">
          Your pages do send their content, but as raw data for the browser to render rather than readable headings and
          paragraphs. Better news than a rebuild — usually a server-rendering setting your developer can switch on.
        </Notice>
      ) : null}

      {partial ? (
        <Notice tone="neutral">
          Some checks could not be completed in time, usually because the site responded slowly. They were left out of your
          score. Re-running in a few minutes normally completes them.
        </Notice>
      ) : null}

      {cached ? (
        <Notice tone="neutral">
          This site was scanned recently, so we are showing those results rather than crawling it again. They are at most six
          hours old.
        </Notice>
      ) : null}
    </div>
  </motion.div>
);

const TONES = {
  neutral: 'border-white/10 bg-white/5 text-neutral-300',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-error/30 bg-error/10 text-error',
} as const;

const Notice: React.FC<{
  tone?: keyof typeof TONES;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tone = 'neutral', title, icon, children }) => (
  <div className={`rounded-2xl border px-5 py-4 text-sm leading-relaxed ${TONES[tone]}`} role={tone === 'error' ? 'alert' : undefined}>
    {title ? (
      <strong className="flex items-center gap-2 mb-1 font-semibold">
        {icon}
        {title}
      </strong>
    ) : null}
    {children}
  </div>
);

const SiteTypeNotice: React.FC<{
  siteType: SiteType;
  confidence: Confidence;
  overridden: boolean;
  evidence?: string[];
  onReclassify?: (siteType: SiteType) => void;
  busy?: boolean;
}> = ({ siteType, confidence, overridden, evidence, onReclassify, busy }) => {
  const [choosing, setChoosing] = useState(false);
  const alternatives = OVERRIDE_OPTIONS.filter((option) => option !== siteType);
  const weak = confidence === 'low' && !overridden;

  return (
    <Notice tone={weak ? 'warning' : 'neutral'} icon={<Info size={18} aria-hidden="true" />}>
      {overridden ? (
        <>You told us this is {withArticle(SITE_TYPE_LABEL[siteType])}, so the checks below are the ones that matter for that.</>
      ) : (
        <>
          We checked this as {withArticle(SITE_TYPE_LABEL[siteType])}
          {weak ? ', though the signals were weak' : ''}, so the checks below are the ones that matter for that kind of site.
          {evidence && evidence.length ? ` We based that on: ${evidence.join('; ')}.` : ''}
        </>
      )}

      {onReclassify ? (
        <div className="mt-3">
          {!choosing ? (
            <button
              type="button"
              onClick={() => setChoosing(true)}
              disabled={busy}
              className="text-sm font-semibold underline transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Not right? Check it as something else
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Re-run as:</span>
              {alternatives.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={busy}
                  onClick={() => onReclassify(option)}
                  className="px-3 py-1 text-xs font-semibold text-white transition-colors border rounded-full border-white/20 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                >
                  {SITE_TYPE_LABEL[option]}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Notice>
  );
};

export default ResultHeader;
