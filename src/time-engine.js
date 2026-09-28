// ------------------------------------
// RELATIVE TIME
// ------------------------------------
// Creates a localized relative timestamp like:
//  - "a few seconds ago"
//  - "5 minutes ago"
// Uses the "time.*" keys from the locale JSON.
export function relativeTime(date, i18n, now = new Date()) {
  const diff = (now.getTime() - date.getTime()) / 1000;

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

export function formatDuration(durationMs, langCode) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  let unit = 'second';
  let value = totalSeconds;

  if (totalSeconds >= 86400) {
    unit = 'day';
    value = Math.floor(totalSeconds / 86400);
  } else if (totalSeconds >= 3600) {
    unit = 'hour';
    value = Math.floor(totalSeconds / 3600);
  } else if (totalSeconds >= 60) {
    unit = 'minute';
    value = Math.floor(totalSeconds / 60);
  }

  const options = {
    style: 'unit',
    unit,
    unitDisplay: 'long',
  };

  try {
    return new Intl.NumberFormat(langCode, options).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', options).format(value);
  }
}

export function formatEventTime(
  item,
  {
    langCode,
    i18n,
    relative = false,
    includeDate = true,
    showDuration = false,
    now = new Date(),
  }
) {
  const baseTime = relative
    ? relativeTime(item.time, i18n, now)
    : formatAbsoluteTime(item.time, langCode, i18n, { includeDate });

  if (!showDuration) return baseTime;

  const endTime = item.endTime == null ? now : item.endTime;
  const durationMs = endTime.getTime() - item.time.getTime();
  const duration = formatDuration(durationMs, langCode);

  if (item.endTime == null) {
    const since = i18n.t('time.since', { duration });
    return relative ? since : `${baseTime} (${since})`;
  }

  return `${baseTime} (${duration})`;
}
