// ------------------------------------
// RELATIVE TIME
// ------------------------------------
// Creates a localized relative timestamp like:
//  - "a few seconds ago"
//  - "5 minutes ago"
// Uses the "time.*" keys from the locale JSON.
export function relativeTime(date, i18n) {
  const diff = (Date.now() - date.getTime()) / 1000;

  if (diff < 60) return i18n.t('time.seconds');
  if (diff < 3600) return i18n.t('time.minutes', { n: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t('time.hours', { n: Math.floor(diff / 3600) });
  return i18n.t('time.days', { n: Math.floor(diff / 86400) });
}

// Formats an absolute timestamp using the locale's "date_format.datetime"
// structure and the browser's Intl date formatting.
export function formatAbsoluteTime(
  date,
  langCode,
  i18n,
  { includeDate = true } = {}
) {
  const datetimeFmt = i18n.t('date_format.datetime');
  const timeFmt = i18n.t('date_format.time');

  const pickTimeFormat = () => {
    if (timeFmt && timeFmt !== 'date_format.time') return timeFmt;

    if (datetimeFmt && typeof datetimeFmt === 'object') {
      const { hour, minute, hour12 } = datetimeFmt;
      const fallback = {};

      if (hour) fallback.hour = hour;
      if (minute) fallback.minute = minute;
      if (hour12 !== undefined) fallback.hour12 = hour12;

      if (Object.keys(fallback).length) return fallback;
    }

    return { hour: '2-digit', minute: '2-digit' };
  };

  const formatOptions = includeDate ? datetimeFmt : pickTimeFormat();

  const base = date.toLocaleString(langCode, formatOptions);
  const suffix = i18n.t('date_format.time_suffix');
  const suffixText =
    typeof suffix === 'string' && suffix !== 'date_format.time_suffix'
      ? suffix.trim()
      : '';

  return suffixText ? `${base} ${suffixText}` : base;
}
