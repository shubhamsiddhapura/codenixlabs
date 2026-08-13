import React, { useEffect, useRef, useState } from 'react';
import { Check, Clipboard, FileCode2 } from 'lucide-react';
import type { FixLanguage } from '../../types/aiReadiness';

const LANGUAGE_LABEL: Record<FixLanguage, string> = {
  robots: 'robots.txt',
  json: 'JSON',
  html: 'HTML',
  markdown: 'llms.txt',
};

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * The generated fix, with a copy button.
 *
 * This is the reason a visitor hands over an email — they get working code, not
 * a description of what to do. So copying has to work, and when it cannot, the
 * visitor has to be told rather than left clicking a button that silently does
 * nothing. Clipboard access fails more often than it looks: an insecure origin,
 * a denied permission, an in-app browser. The fallback selects the code so the
 * keyboard shortcut works, and the button says so.
 */
export const FixBlock: React.FC<{ code: string; language: FixLanguage | null; target?: string | null }> = ({
  code,
  language,
  target,
}) => {
  const [state, setState] = useState<CopyState>('idle');
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (state === 'idle') return;
    const id = window.setTimeout(() => setState('idle'), state === 'copied' ? 2200 : 6000);
    return () => window.clearTimeout(id);
  }, [state]);

  const copy = async (): Promise<void> => {
    if (await copyText(code)) {
      setState('copied');
      return;
    }
    selectElement(codeRef.current);
    setState('failed');
  };

  const button = {
    copied: { label: 'Copied', className: 'bg-success/15 text-success border-success/30' },
    failed: { label: 'Press Ctrl+C', className: 'bg-warning/15 text-warning border-warning/30' },
    idle: { label: 'Copy', className: 'bg-white/5 text-neutral-200 border-white/15 hover:bg-white/10' },
  }[state];

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
          <FileCode2 size={16} className="text-accent" aria-hidden="true" />
          Copy-paste fix
          {language ? <span className="font-normal text-neutral-500">· {LANGUAGE_LABEL[language]}</span> : null}
        </span>

        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${button.className}`}
        >
          {state === 'copied' ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />}
          {button.label}
        </button>
      </div>

      {target ? (
        <p className="mb-2 text-xs leading-relaxed text-neutral-400">
          <span className="font-semibold text-neutral-300">Where this goes:</span> {target}
        </p>
      ) : null}

      <pre
        ref={codeRef}
        className="p-4 overflow-auto text-xs leading-relaxed border rounded-xl bg-neutral-900 border-white/10 text-neutral-200 max-h-96"
      >
        <code>{code}</code>
      </pre>

      <p aria-live="polite" className="mt-2 text-xs text-neutral-500 min-h-[1rem]">
        {state === 'failed' ? 'We selected it for you — press Ctrl+C (or Cmd+C) to copy.' : ''}
      </p>
    </div>
  );
};

async function copyText(text: string): Promise<boolean> {
  // The async clipboard API needs a secure context and an un-denied permission.
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Denied or unavailable — fall through to the textarea route.
    }
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function selectElement(element: HTMLElement | null): void {
  if (!element) return;
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default FixBlock;
