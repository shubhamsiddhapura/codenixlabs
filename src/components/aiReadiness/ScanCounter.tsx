import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { fetchScanStats } from '../../services/aiReadinessService';

/**
 * How many sites have been checked, counting up as more are.
 *
 * Below this figure the component renders nothing at all.
 *
 * A usage counter is social proof, and social proof runs backwards when the
 * number is small: "24 websites checked" tells a visitor nobody uses this,
 * which costs more than showing no counter would. Raising this before launch
 * hides the counter until it helps, and it then appears by itself once real
 * traffic arrives — no code change and nobody having to remember.
 *
 * Set to 0 while developing, so the thing is visibly working.
 */
const MIN_SITES = 0;

/** Long enough to feel live if a tab is left open, rare enough to be free. */
const REFRESH_MS = 45_000;

export const ScanCounter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [sites, setSites] = useState<number | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let live = true;

    const load = (): void => {
      fetchScanStats()
        .then((stats) => {
          if (live) setSites(stats.sitesChecked);
        })
        // A counter is decoration. If the API is unreachable the page should
        // carry on as though it were never here, not show an error about it.
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, []);

  /**
   * Count up to the real figure rather than snapping to it.
   *
   * Only on the way up, and only over a fixed short duration — a number that
   * animates every time it refreshes would be a distraction rather than a
   * detail, and one that animates downwards would look like a bug.
   */
  const from = useRef(0);
  useEffect(() => {
    if (sites === null) return;
    if (sites <= from.current) {
      setShown(sites);
      from.current = sites;
      return;
    }

    const start = from.current;
    const startedAt = performance.now();
    const DURATION = 900;
    let frame = 0;

    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / DURATION);
      // Ease out, so it decelerates into the final number instead of stopping dead.
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(start + (sites - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = sites;
    };

    frame = requestAnimationFrame(step);

    /**
     * The number must be right even if the animation never runs.
     *
     * requestAnimationFrame is suspended in background tabs and in some
     * embedded webviews, and when it is, the count-up never advances — leaving
     * "0 websites checked so far" on screen indefinitely. That is not a missing
     * flourish, it is a false figure, and it is worse than showing nothing.
     * This snaps to the real value if the animation has not delivered it.
     */
    const settle = window.setTimeout(() => {
      setShown(sites);
      from.current = sites;
    }, DURATION + 400);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [sites]);

  if (sites === null || sites < MIN_SITES) return null;

  /*
   * Block-level, not inline-flex.
   *
   * As an inline element it shared a line with whatever followed it — on the
   * homepage band the next sibling is a link, so the count ran straight into
   * "See what the report includes" and the two overlapped. Vertical margins do
   * not separate inline boxes either, so the `mt-6` a caller passes did nothing.
   * A flex row on its own line behaves the way every caller already expects.
   */
  return (
    <div className={`flex items-center gap-2 text-sm text-neutral-400 ${className}`} aria-live="polite">
      <Activity size={15} className="flex-shrink-0 text-accent" aria-hidden="true" />
      <p>
        <strong className="font-semibold tabular-nums text-white">{shown.toLocaleString()}</strong> websites checked so far
      </p>
    </div>
  );
};

export default ScanCounter;
