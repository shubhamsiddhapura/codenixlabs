import React, { useState } from 'react';
import { Check, ChevronDown, Radio, X } from 'lucide-react';
import type { AgentAccessRow, AgentAccessStatus } from '../../types/aiReadiness';

/**
 * Every AI crawler, and whether it can reach this site.
 *
 * The check already knew all of this and threw it away into one sentence. A
 * sentence cannot be checked; this table can — each row names the crawler, the
 * verdict, and whether we read it from robots.txt or observed it by asking the
 * server directly. Someone can take the live rows straight to their own access
 * logs and confirm or refute us, which is the strongest thing a free tool can
 * offer.
 *
 * It sits outside the paywall on purpose. This is evidence for the verdict, not
 * advice about it, and gating your evidence is how a score stops being
 * believable.
 */
const STATUS: Record<AgentAccessStatus, { label: string; text: string; bg: string; icon: React.ReactNode }> = {
  allowed: {
    label: 'Allowed',
    text: 'text-success',
    bg: 'bg-success/10',
    icon: <Check size={14} aria-hidden="true" />,
  },
  blocked_robots: {
    label: 'Blocked · robots.txt',
    text: 'text-warning',
    bg: 'bg-warning/10',
    icon: <X size={14} aria-hidden="true" />,
  },
  blocked_server: {
    label: 'Blocked · server',
    text: 'text-error',
    bg: 'bg-error/10',
    icon: <X size={14} aria-hidden="true" />,
  },
};

export const AgentAccessTable: React.FC<{ rows: AgentAccessRow[] }> = ({ rows }) => {
  const [open, setOpen] = useState(false);

  if (!rows.length) return null;

  const allowed = rows.filter((row) => row.status === 'allowed').length;
  const live = rows.filter((row) => row.liveTested).length;

  return (
    <div className="mt-5 overflow-hidden border rounded-xl border-white/12">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center justify-between w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">
            {allowed} of {rows.length} AI crawlers can reach you
          </span>
          <span className="block mt-0.5 text-xs text-neutral-500">
            {live} checked by asking your server directly, the rest read from robots.txt
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`flex-shrink-0 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <ul className="border-t divide-y border-white/10 divide-white/8">
          {rows.map((row) => {
            const style = STATUS[row.status];
            return (
              <li key={row.agent} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                <span className="min-w-0 flex-1 basis-[40%]">
                  <span className="block text-sm font-medium text-neutral-200">{row.label}</span>
                  <span className="block font-mono text-[11px] text-neutral-500">{row.agent}</span>
                </span>

                {row.liveTested ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary"
                    title="We sent a real request as this crawler"
                  >
                    <Radio size={10} aria-hidden="true" />
                    Live
                  </span>
                ) : null}

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}
                >
                  {style.icon}
                  {style.label}
                </span>

                {row.detail ? (
                  <span className="w-full text-[11px] leading-relaxed text-neutral-500">{row.detail}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default AgentAccessTable;
