import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { CONSENT_SOURCE, CONSENT_TEXT, type LeadInput } from '../../types/aiReadiness';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * The lead-capture gate.
 *
 * Validation mirrors the API's rather than trusting it: a round trip to be told
 * "that email is invalid" is where people abandon a form. The API still
 * validates — this only saves the trip.
 *
 * The consent checkbox is not decoration. India's DPDP Act requires consent to
 * be free, specific, informed and given by a clear affirmative action before
 * personal data is processed, and TRAI's rules require a recorded opt-in before
 * any promotional WhatsApp message. A pre-ticked box would satisfy neither.
 */
export const LeadGate: React.FC<{
  lockedChecks: number;
  fixesAvailable: number;
  onSubmit: (lead: LeadInput) => void;
  busy: boolean;
  error: string | null;
}> = ({ lockedChecks, fixesAvailable, onSubmit, busy, error }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  const problems = validate({ name, email, whatsapp, consent });
  const valid = Object.keys(problems).length === 0;

  return (
    <div className="relative overflow-hidden border rounded-3xl border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-surface">
      <div className="absolute inset-0 opacity-40 bg-glow" aria-hidden="true" />

      <div className="relative z-10 p-6 sm:p-9">
        <h2 className="text-2xl font-bold text-white font-orbitron sm:text-3xl">See your full report</h2>
        <p className="max-w-2xl mt-3 leading-relaxed text-neutral-300">
          {describeGate(lockedChecks, fixesAvailable)} We will email you a copy so you can forward it to whoever maintains
          your site.
        </p>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (valid && !busy) {
              onSubmit({
                name: name.trim(),
                email: email.trim(),
                whatsapp: whatsapp.trim(),
                consent,
                consentText: CONSENT_TEXT,
                consentSource: CONSENT_SOURCE,
              });
            }
          }}
          className="grid gap-5 mt-8"
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="lead-name" label="Your name" error={touched ? problems.name : undefined}>
              <input
                id="lead-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                disabled={busy}
                className={inputClass}
              />
            </Field>

            <Field id="lead-email" label="Email" error={touched ? problems.email : undefined}>
              <input
                id="lead-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                disabled={busy}
                className={inputClass}
              />
            </Field>

            <Field id="lead-whatsapp" label="WhatsApp number" error={touched ? problems.whatsapp : undefined}>
              <input
                id="lead-whatsapp"
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                autoComplete="tel"
                placeholder="+91 98765 43210"
                disabled={busy}
                className={inputClass}
              />
            </Field>
          </div>

          <label className="flex items-start gap-3 text-sm cursor-pointer text-neutral-300">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={busy}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-white/25 bg-white/10 accent-[#8948FF]"
            />
            <span>{CONSENT_TEXT}</span>
          </label>
          {touched && problems.consent ? <p className="-mt-3 text-xs text-error">{problems.consent}</p> : null}

          {error ? (
            <div className="px-4 py-3 text-sm border rounded-xl border-error/30 bg-error/10 text-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={busy || (touched && !valid)}
              className="inline-flex items-center justify-center w-full gap-2 px-8 py-4 font-semibold text-white transition-all duration-300 rounded-full sm:w-auto bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
            >
              {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
              {busy ? 'Unlocking…' : 'Unlock my full report'}
            </button>

            <p className="inline-flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck size={16} className="text-accent" aria-hidden="true" />
              No newsletter. We never resell your details.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60';

const Field: React.FC<{ id: string; label: string; error?: string; children: React.ReactNode }> = ({
  id,
  label,
  error,
  children,
}) => (
  <div>
    <label htmlFor={id} className="block mb-2 text-sm font-medium text-neutral-200">
      {label}
    </label>
    {children}
    {error ? <p className="mt-1.5 text-xs text-error">{error}</p> : null}
  </div>
);

/** Only the fields a person actually fills in — the wording is a constant. */
type LeadFields = Pick<LeadInput, 'name' | 'email' | 'whatsapp' | 'consent'>;

function validate(lead: LeadFields): Partial<Record<keyof LeadFields, string>> {
  const problems: Partial<Record<keyof LeadFields, string>> = {};

  if (lead.name.trim().length < 2) problems.name = 'Please enter your name.';
  if (!EMAIL_PATTERN.test(lead.email.trim())) problems.email = 'That does not look like a valid email address.';

  // Indian mobiles are 10 digits; with a country code the range below covers
  // the rest of the world. Same bounds the API enforces.
  const digits = lead.whatsapp.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    problems.whatsapp = 'Include your country code, e.g. +91 98765 43210.';
  }

  if (!lead.consent) problems.consent = 'Please tick the box so we know we may contact you.';

  return problems;
}

function describeGate(lockedChecks: number, fixesAvailable: number): string {
  const checksPart =
    lockedChecks > 0
      ? `${lockedChecks} more check${lockedChecks === 1 ? '' : 's'}, plus what each finding is costing you`
      : 'the full breakdown of every finding and what it is costing you';

  if (fixesAvailable > 0) {
    return `${capitalise(checksPart)} — and we have already written ${fixesAvailable} ready-to-paste fix${
      fixesAvailable === 1 ? '' : 'es'
    } for the problems we found.`;
  }
  return `${capitalise(checksPart)}.`;
}

const capitalise = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export default LeadGate;
