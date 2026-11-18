/**
 * SupportDesk - Canonical Display Formatters & Plain Language Helpers
 * Centralizes rounding, units, and human-friendly status translations.
 */

export const formatPct = (val?: number | null, decimals: number = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(decimals)}%`;
};

export const formatHours = (val?: number | null, decimals: number = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.0 hrs';
  return `${val.toFixed(decimals)} hrs`;
};

export const formatCount = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val).toLocaleString('en-US');
};

/**
 * Human-friendly plain-language status mapping
 */
export const statusToPlainLanguage = (status: string): { label: string; badgeClass: string } => {
  switch (status) {
    case 'Open - with L1':
      return {
        label: 'With support',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
      };
    case 'Ready to Escalate':
      return {
        label: 'Ready for engineering',
        badgeClass: 'bg-teal-50 text-brand-tealDark border-teal-200'
      };
    case 'Open - with Engineering':
      return {
        label: 'Waiting on engineering',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    case 'Closed':
      return {
        label: 'Resolved',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      };
    case 'Reopened':
      return {
        label: 'Reopened',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      };
  }
};

/**
 * Human-friendly engineering handoff count
 */
export const handoffToPlainLanguage = (count: number): string => {
  if (!count || count === 0) return 'Direct';
  if (count === 1) return 'Sent to engineering once';
  return `Sent to engineering ${count} times`;
};
