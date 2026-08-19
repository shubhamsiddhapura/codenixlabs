import React, { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

/**
 * The scan can take up to twenty seconds, which is long enough that a static
 * spinner reads as a hang. The status line narrates what is genuinely
 * happening, in the order the engine does it, and the last step holds rather
 * than looping — so it never claims to be further along than it is.
 */
const PROGRESS_STEPS = [
  'Fetching your homepage…',
  'Reading your robots.txt…',
  'Asking your server as GPTBot and Claude…',
  'Working out what kind of site this is…',
  'Checking your structured data…',
  'Looking for your policy pages…',
  'Almost there…',
];

interface ScanFormProps {
  onScan: (url: string) => void;
  busy: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  submitLabel?: string;
  /** `compact` drops the progress line for the homepage band. */
  variant?: 'full' | 'compact';
}

export const ScanForm: React.FC<ScanFormProps> = ({
  onScan,
  busy,
  autoFocus = false,
  placeholder = 'yourwebsite.com',
  submitLabel = 'Check my site',
  variant = 'full',
}) => {
  const [url, setUrl] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = url.trim();
        if (trimmed && !busy) onScan(trimmed);
      }}
      className="w-full"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2 text-neutral-500"
            size={20}
            aria-hidden="true"
          />
          <input
            type="text"
            inputMode="url"
            autoFocus={autoFocus}
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            value={url}
            disabled={busy}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={placeholder}
            aria-label="Website address"
            className="w-full py-4 pl-12 pr-4 text-base text-white transition-colors border rounded-full outline-none bg-white/5 border-white/15 placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 font-medium text-white transition-all duration-300 rounded-full bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:hover:shadow-none whitespace-nowrap"
        >
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Checking…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>

      {busy && variant === 'full' ? <ProgressLine /> : null}
    </form>
  );
};

const ProgressLine: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, PROGRESS_STEPS.length - 1));
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="mt-4 text-sm text-center text-neutral-400 sm:text-left" aria-live="polite">
      {PROGRESS_STEPS[step]}
    </p>
  );
};

export default ScanForm;
