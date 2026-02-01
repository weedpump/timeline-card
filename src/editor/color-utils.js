function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value) {
  const raw = value.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split('')
      .map((c) => `${c}${c}`)
      .join('')}`;
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw}`;
  }
  return null;
}

function rgbToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}

function parseRgbString(value) {
  const match = value
    .replace(/\s+/g, '')
    .match(/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,([0-9.]+))?\)$/);
  if (!match) return null;

  const r = clamp(parseInt(match[1], 10), 0, 255);
  const g = clamp(parseInt(match[2], 10), 0, 255);
  const b = clamp(parseInt(match[3], 10), 0, 255);
  const alpha = match[4] !== undefined ? clamp(parseFloat(match[4]), 0, 1) : 1;

  return { hex: rgbToHex({ r, g, b }), alpha };
}

function parseHexColor(value) {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  const hex = normalized.slice(1);
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function parseColorValue(value, fallbackHex = '#00aaff') {
  if (!value || typeof value !== 'string') {
    return { hex: fallbackHex, alpha: 1 };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { hex: fallbackHex, alpha: 1 };
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === 'transparent') {
    return { hex: '#000000', alpha: 0 };
  }

  if (lowered.startsWith('#')) {
    const hex = normalizeHex(lowered);
    if (hex) {
      return { hex, alpha: 1 };
    }
  }

  if (lowered.startsWith('rgb')) {
    const parsed = parseRgbString(lowered);
    if (parsed) return parsed;
  }

  const probe = new Option();
  probe.style.color = trimmed;
  if (probe.style.color) {
    const parsed = parseRgbString(probe.style.color);
    if (parsed) return parsed;
  }

  return { hex: fallbackHex, alpha: 1 };
}

export function formatColorValue(hex, alpha = 1) {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;

  const clamped = clamp(alpha, 0, 1);
  if (clamped >= 1) return rgbToHex(rgb);

  const alphaText = parseFloat(clamped.toFixed(2)).toString();
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaText})`;
}

export function alphaToPercent(alpha) {
  return Math.round(100 * clamp(alpha, 0, 1));
}

export function percentToAlpha(value) {
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  if (Number.isNaN(parsed)) return 1;
  return clamp(parsed / 100, 0, 1);
}
