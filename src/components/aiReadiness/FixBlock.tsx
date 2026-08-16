import React, { useEffect, useRef, useState } from 'react';
import { Check, Clipboard, CornerDownRight, FileCode2 } from 'lucide-react';
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
    /*
     * One bordered unit: instruction band on top, code below.
     *
     * The destination used to be a small grey line above a loud black box —
     * set fainter and smaller than the code it explains, which is backwards.
     * A generated block of JSON-LD is worth nothing to the person holding it
     * until they know which file it belongs in, so that sentence now leads,
     * at full body size, inside a band that visually owns the code beneath it.
     */
    <div className="mt-6 overflow-hidden border rounded-xl border-white/15">
      <div className="px-4 py-3.5 bg-white/[0.04] border-b border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase font-orbitron text-accent">
            <FileCode2 size={15} aria-hidden="true" />
            Copy this fix
            {language ? <span className="font-medium normal-case tracking-normal text-neutral-500">· {LANGUAGE_LABEL[language]}</span> : null}
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
          <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2 text-sm leading-relaxed text-neutral-200">
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
              <CornerDownRight size={14} aria-hidden="true" />
              Paste it into
            </span>
            <span className="break-all">{target}</span>
          </p>
        ) : null}
      </div>

      {/*
        Wrapped, not side-scrolling.

        One long line — a product description inside a JSON-LD block is often
        200 characters — pushed the whole block into horizontal scroll, so the
        reader saw a truncated line and had to drag sideways to read code they
        are about to paste. Wrapping keeps every character on screen; copying
        is unaffected because the newlines in the source are what get copied.
      */}
      <pre
        ref={codeRef}
        className="p-4 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap break-words bg-neutral-900 text-neutral-200 max-h-96"
      >
        <code>{code}</code>
      </pre>

      <p aria-live="polite" className="px-4 text-xs text-neutral-500 empty:hidden">
        {state === 'failed' ? <span className="block py-2">We selected it for you — press Ctrl+C (or Cmd+C) to copy.</span> : ''}
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
