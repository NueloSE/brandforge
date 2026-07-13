// Palette engine: world-grounded hues in, validated 5-role system out.
// The LLM proposes hue/anchor ideas from the brief's world (e.g. "adire indigo",
// "crust gold"); this module turns them into a coherent, WCAG-passing system.
// Deterministic math — no model in the loop for the guarantees.

export interface Palette {
  primary: string;   // brand lead: wordmark, headers, hero surfaces
  accent: string;    // CTAs, highlights — one per view
  ground: string;    // page/packaging background
  ink: string;       // running text on ground
  secondary: string; // tints, dividers, quiet UI
  /** contrast receipts shown on the board — proof of craft */
  checks: { pair: string; ratio: number; pass: boolean }[];
}

// --- color math ------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function relativeLuminance(hex: string): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// HSL round-trip for lightness adjustment
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const t = (x: number) => {
    x = ((x % 1) + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return rgbToHex(t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255);
}

/** Nudge a color's lightness (keeping hue/sat) until it hits `min` contrast vs `against`. */
export function ensureContrast(hex: string, against: string, min: number, darken: boolean): string {
  let [h, s, l] = hexToHsl(hex);
  let out = hex;
  for (let i = 0; i < 40 && contrastRatio(out, against) < min; i++) {
    l += darken ? -0.02 : 0.02;
    l = Math.max(0.02, Math.min(0.98, l));
    out = hslToHex(h, s, l);
  }
  return out;
}

// --- palette builder ---------------------------------------------------------

export interface PaletteSeed {
  primaryHint: string;  // LLM's world-grounded proposal, hex
  accentHint: string;
  groundHint: string;   // usually a near-white tinted toward the world
}

/**
 * Build the 5-role system from LLM hints, then enforce:
 *  - ink on ground >= 7:1        (body text, AAA-leaning)
 *  - primary on ground >= 4.5:1  (headers)
 *  - accent on primary >= 3:1    (large text / graphics on hero surfaces)
 *  - ground stays light (L* guard) so deliverables print well
 */
export function buildPalette(seed: PaletteSeed): Palette {
  let ground = seed.groundHint;
  const [, , gl] = hexToHsl(ground);
  if (gl < 0.88) {
    const [h, s] = hexToHsl(ground);
    ground = hslToHex(h, Math.min(s, 0.35), 0.94);
  }

  let primary = ensureContrast(seed.primaryHint, ground, 4.5, true);
  // ink: primary's hue family, near-black, guaranteed readable
  const [ph, ps] = hexToHsl(primary);
  let ink = ensureContrast(hslToHex(ph, Math.min(ps, 0.45), 0.14), ground, 7, true);
  let accent = ensureContrast(seed.accentHint, primary, 3, false);
  // secondary: quiet tint of primary on the ground side
  const secondary = hslToHex(ph, Math.max(0.18, ps * 0.45), 0.78);

  const checks = [
    { pair: 'ink on ground', ratio: r2(contrastRatio(ink, ground)), pass: contrastRatio(ink, ground) >= 7 },
    { pair: 'primary on ground', ratio: r2(contrastRatio(primary, ground)), pass: contrastRatio(primary, ground) >= 4.5 },
    { pair: 'accent on primary', ratio: r2(contrastRatio(accent, primary)), pass: contrastRatio(accent, primary) >= 3 },
  ];

  return { primary, accent, ground, ink, secondary, checks };
}

const r2 = (n: number) => Math.round(n * 10) / 10;
