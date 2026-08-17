import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Globe2 } from 'lucide-react';

/**
 * Shown instead of a report when no website could be read at the address.
 *
 * Deliberately has no grade, no ring, no score and no checks. We used to give a
 * parked domain a D and 49 out of 100, and an unregistered one an F and 35 —
 * then advise both to add Product schema. Those are confident verdicts about
 * sites nobody has built. A letter grade cannot say "there is nothing here": a
 * D reads as "your website has problems" and an F reads as "your website is
 * terrible", and both are claims about a website that did not answer.
 *
 * The cause — parked, no DNS record, server offline, timed out, broken
 * certificate, redirect loop — is carried in `summary`, which the API writes
 * per cause. This component stays generic on purpose: it must not assume the
 * site was never built, because a site that is merely down was.
 *
 * There is no lead-capture gate here either. Nothing has been withheld, so
 * there is nothing to unlock, and asking for an email in exchange for "we found
 * no website" would be taking details for nothing.
 */
export const NoWebsiteNotice: React.FC<{ domain: string; summary: string; onScanAnother?: () => void }> = ({
  domain,
  summary,
  onScanAnother,
}) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="relative py-12"
  >
    <div className="container max-w-3xl px-4 mx-auto sm:px-6 lg:px-8">
      <div className="p-6 text-center border rounded-3xl border-white/10 bg-surface/60 sm:p-10">
        <span className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-white/5 text-neutral-400">
          <Globe2 size={30} aria-hidden="true" />
        </span>

        <h2 className="text-2xl font-bold text-white font-orbitron sm:text-3xl">No website found here</h2>
        <p className="mt-2 text-sm break-all text-neutral-400">{domain}</p>

        <p className="max-w-xl mx-auto mt-6 text-[17px] leading-[1.75] text-neutral-300">{summary}</p>

        <div className="p-5 mt-8 text-sm leading-relaxed text-left border rounded-2xl border-white/10 bg-white/[0.02] text-neutral-400">
          <strong className="block mb-2 font-semibold text-white">Why there is no score</strong>
          Grading needs a page to grade, and none arrived. A letter would say your site has problems, when the honest
          answer is that there was nothing here to read — which is exactly what an AI assistant would have found too.
          Once there is something at this address, scan it again and you will get a real report.
        </div>

        <div className="flex flex-col items-center justify-center gap-4 mt-8 sm:flex-row">
          {onScanAnother ? (
            <button
              type="button"
              onClick={onScanAnother}
              className="w-full px-8 py-4 font-semibold text-white transition-all duration-300 rounded-full sm:w-auto bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
            >
              Check a different address
            </button>
          ) : null}
          <Link
            to="/contact"
            className="w-full px-8 py-4 font-semibold text-center transition-colors border rounded-full sm:w-auto border-white/15 text-neutral-200 hover:bg-white/5"
          >
            Need a website building?
          </Link>
        </div>
      </div>
    </div>
  </motion.section>
);

export default NoWebsiteNotice;
