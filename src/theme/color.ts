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
