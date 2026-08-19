import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BotIcon, Sparkles } from 'lucide-react';

import ScanForm from '../aiReadiness/ScanForm';
import ScanCounter from '../aiReadiness/ScanCounter';

/**
 * The free tool, high on the homepage.
 *
 * A visitor who types their own address here has already told us what they
 * want, before reading a word of marketing — which is worth more than any
 * amount of scrolling. The scan itself runs on the dedicated page, so this band
 * stays fast and the result gets the room it needs.
 */
const LOGOS = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Copilot'];

export const AiReadinessBand: React.FC = () => {
  const navigate = useNavigate();
  const [handedOff, setHandedOff] = useState(false);

  const handleScan = (url: string): void => {
    setHandedOff(true);
    navigate(`/ai-readiness?url=${encodeURIComponent(url)}`);
  };

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-glow" aria-hidden="true" />

      <div className="container relative z-10 px-4 mx-auto sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="relative max-w-5xl mx-auto overflow-hidden border rounded-3xl border-primary/25 bg-gradient-to-br from-primary/12 via-surface to-surface"
        >
          <div className="absolute inset-0 opacity-30 grid-bg" aria-hidden="true" />

          <div className="relative z-10 p-8 sm:p-12">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-xs font-semibold tracking-wider uppercase border rounded-full border-accent/40 bg-accent/10 text-accent">
                <Sparkles size={14} aria-hidden="true" />
                Free tool · Live in 20 seconds
              </span>

              <h2 className="text-3xl font-bold leading-tight text-white font-orbitron sm:text-4xl lg:text-5xl">
                Your customers are asking AI.
                <br className="hidden sm:block" />
                <span className="text-primary neon-text"> Can it find you?</span>
              </h2>

              <p className="mt-5 text-lg leading-relaxed text-neutral-300">
                Most AI assistants cannot run JavaScript. If your site builds itself in the browser, they see a blank page —
                and recommend someone else. Paste your address and find out in under twenty seconds, free.
              </p>
            </div>

            <div className="max-w-2xl mt-8">
              <ScanForm onScan={handleScan} busy={handedOff} submitLabel="Check my site free" variant="compact" />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-8">
              <span className="inline-flex items-center gap-2 text-xs tracking-wider uppercase text-neutral-500">
                <BotIcon size={14} aria-hidden="true" />
                We test against
              </span>
              {LOGOS.map((name) => (
                <span key={name} className="text-sm font-medium text-neutral-400">
                  {name}
                </span>
              ))}
            </div>

            {/* Renders nothing until the count is worth showing — see ScanCounter. */}
            <ScanCounter className="mt-6" />

            <button
              type="button"
              onClick={() => navigate('/ai-readiness')}
              className="inline-flex items-center gap-2 mt-8 text-sm font-semibold transition-colors text-primary hover:text-white"
            >
              See what the report includes
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AiReadinessBand;
