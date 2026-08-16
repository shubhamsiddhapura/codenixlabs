import React from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import ResultHeader from './ResultHeader';
import CheckCard from './CheckCard';
import { SAMPLE_AUDIT, SAMPLE_CHECKS, SAMPLE_DOMAIN, SAMPLE_SUMMARY } from '../../data/sampleReport';

/**
 * What you get back, shown before you type anything.
 *
 * Borrowed from isvisible.ai, who do this better than anyone in the category:
 * a visitor deciding whether to hand over an address can see the whole shape of
 * the answer first. It removes the leap of faith at the input box, and it lets
 * the report — which is the actually persuasive part — do the selling instead
 * of a paragraph claiming the report is good.
 *
 * It renders through the real ResultHeader and CheckCard rather than a mockup,
 * so it can never quietly drift from what we actually send. If the report
 * changes, this changes with it.
 *
 * The reclassify control is deliberately not wired: there is nothing to
 * re-scan, and a button that silently does nothing is worse than no button.
 */
export const SampleReport: React.FC = () => (
  <section className="relative py-20">
    <div className="container max-w-3xl px-4 mx-auto sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center mb-14">
        <span className="inline-flex items-center gap-2 px-4 py-2 mb-5 text-xs font-semibold tracking-wider uppercase border rounded-full border-secondary/40 bg-secondary/10 text-secondary">
          <Eye size={14} aria-hidden="true" />
          Example report
        </span>
        <h2 className="text-3xl font-bold text-white font-orbitron sm:text-4xl">This is what you get back</h2>
        <p className="mt-4 text-lg text-neutral-400">
          A real report for a made-up shop, in the same layout yours arrives in — grade, findings, and the code to fix
          them.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        // Not interactive: this is an illustration of a report, and letting
        // someone click into a fictitious store's controls would be confusing.
        aria-label="Example of an AI readiness report"
      >
        <ResultHeader
          domain={SAMPLE_DOMAIN}
          grade="C"
          score={68}
          summary={SAMPLE_SUMMARY}
          siteType="ecommerce"
          confidence="high"
          overridden={false}
          audit={SAMPLE_AUDIT}
          partial={false}
        />

        <div className="grid gap-4 mt-8">
          {SAMPLE_CHECKS.map((check, index) => (
            <CheckCard key={check.checkId} check={check} variant="unlocked" index={index} />
          ))}
        </div>

        <p className="mt-6 text-sm text-center text-neutral-500">
          Your real report covers all seven checks. <span className="text-neutral-400">example-store.in</span> is not a
          real shop — we would not publish a real one&rsquo;s grade without asking.
        </p>
      </motion.div>
    </div>
  </section>
);

export default SampleReport;
