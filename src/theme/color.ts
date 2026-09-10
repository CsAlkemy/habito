/**
 * The design canvas mixes colours with CSS `color-mix(in srgb, …)`, which has no
 * React Native equivalent. `mix` reproduces it: linear interpolation in sRGB,
 * the same maths the browser runs.
 */

type RGB = { r: number; g: number; b: number };

function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: RGB): string {
  const part = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** `mix(26, '#1E1E1E', accent)` === `color-mix(in srgb, accent 26%, #1E1E1E)` */
export function mix(pct: number, base: string, top: string): string {
  const a = parseHex(top);
  const b = parseHex(base);
  const t = pct / 100;
  return toHex({
    r: a.r * t + b.r * (1 - t),
    g: a.g * t + b.g * (1 - t),
    b: a.b * t + b.b * (1 - t),
  });
}

/** `#RRGGBB` + opacity → `rgba(...)`, for the translucent overlays in the design. */
export function alpha(hex: string, opacity: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** `'#abc'`, `'ABCDEF'`, `'#aabbcc'` → `'#aabbcc'`; anything else → null. */
export function normalizeHex(input: string): string | null {
  const h = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$/.test(h) && !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return toHex(parseHex(h));
}

export type HSL = { h: number; s: number; l: number };

/** `#RRGGBB` → hue 0–360, saturation 0–100, lightness 0–100. */
export function hexToHsl(hex: string): HSL {
  const { r, g, b } = parseHex(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

/** hue 0–360, saturation 0–100, lightness 0–100 → `#rrggbb`. */
export function hslToHex(h: number, s: number, l: number): string {
  const hn = (((h % 360) + 360) % 360) / 60;
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((hn % 2) - 1));
  const m = ln - c / 2;
  let rgb: [number, number, number];
  if (hn < 1) rgb = [c, x, 0];
  else if (hn < 2) rgb = [x, c, 0];
  else if (hn < 3) rgb = [0, c, x];
  else if (hn < 4) rgb = [0, x, c];
  else if (hn < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return toHex({ r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 });
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = (c: number) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
