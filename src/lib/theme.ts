// RetailX CRM design tokens. Pure TypeScript (no React Native imports) so the contrast rules can be unit-tested.
// Semantic tokens only: screens never use raw hex values, they read `useTheme().c.<token>`.

export type Scheme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Colors {
  bg: string; surface: string; surfaceAlt: string; surfaceRaised: string; border: string; borderStrong: string; overlay: string;
  text: string; textMuted: string; textFaint: string;
  primary: string; onPrimary: string; primarySoft: string; onPrimarySoft: string;
  secondary: string; secondarySoft: string; accent: string; accentSoft: string;
  success: string; successSoft: string; onSuccessSoft: string;
  warning: string; warningSoft: string; onWarningSoft: string;
  danger: string; dangerSoft: string; onDangerSoft: string;
  gradientA: string; gradientB: string; skeleton: string; skeletonHi: string;
}

export const light: Colors = {
  bg: '#F7F8FC', surface: '#FFFFFF', surfaceAlt: '#EFF1F9', surfaceRaised: '#FFFFFF', border: '#E4E7F2', borderStrong: '#C9CEE3', overlay: 'rgba(16,19,33,0.45)',
  text: '#171B2D', textMuted: '#4D5470', textFaint: '#626987',
  primary: '#4338CA', onPrimary: '#FFFFFF', primarySoft: '#E8E9FD', onPrimarySoft: '#3730A3',
  secondary: '#7C3AED', secondarySoft: '#F0E8FE', accent: '#0891B2', accentSoft: '#DDF6FB',
  success: '#047857', successSoft: '#DCF7EC', onSuccessSoft: '#046C4E',
  warning: '#B45309', warningSoft: '#FEF1D6', onWarningSoft: '#8A4108',
  danger: '#C73A37', dangerSoft: '#FDE8E7', onDangerSoft: '#B3302D',
  gradientA: '#4338CA', gradientB: '#7C3AED', skeleton: '#E8EAF4', skeletonHi: '#F5F6FB',
};

export const dark: Colors = {
  bg: '#101321', surface: '#191E30', surfaceAlt: '#222844', surfaceRaised: '#1F2540', border: '#2B3250', borderStrong: '#3F4870', overlay: 'rgba(0,0,0,0.6)',
  text: '#F4F6FF', textMuted: '#B5BBD8', textFaint: '#8D94B8',
  primary: '#8B8CFA', onPrimary: '#0E1020', primarySoft: '#272B55', onPrimarySoft: '#C7C8FF',
  secondary: '#A78BFA', secondarySoft: '#2E2552', accent: '#22D3EE', accentSoft: '#12384A',
  success: '#34D399', successSoft: '#12372E', onSuccessSoft: '#8FF0C7',
  warning: '#FBBF24', warningSoft: '#3D3012', onWarningSoft: '#FDDD85',
  danger: '#FF8A85', dangerSoft: '#40201F', onDangerSoft: '#FFB3AF',
  gradientA: '#5B5BE0', gradientB: '#8B5CF6', skeleton: '#232944', skeletonHi: '#2D3558',
};

export const palettes: Record<Scheme, Colors> = { light, dark };

export function resolveScheme(mode: ThemeMode, system: Scheme | null | undefined): Scheme {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

// ---- layout tokens ----
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const MAX_CONTENT = 720; // dp, content column cap on tablets / landscape / web
export const MIN_TOUCH = 44; // dp, accessibility minimum touch target
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

// ---- typography (Inter) ----
export const fontFamily = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' } as const;
export const type = {
  display: { fontSize: 32, lineHeight: 38, family: 'bold', tracking: -0.8 },
  title: { fontSize: 22, lineHeight: 28, family: 'bold', tracking: -0.4 },
  heading: { fontSize: 17, lineHeight: 24, family: 'semibold', tracking: -0.2 },
  body: { fontSize: 15, lineHeight: 22, family: 'regular', tracking: 0 },
  bodyStrong: { fontSize: 15, lineHeight: 22, family: 'semibold', tracking: 0 },
  label: { fontSize: 13, lineHeight: 18, family: 'medium', tracking: 0.1 },
  caption: { fontSize: 12, lineHeight: 16, family: 'regular', tracking: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, family: 'semibold', tracking: 0.9 },
} as const;
export type TypeKey = keyof typeof type;

// ---- elevation (as plain style fragments) ----
export const elevation = {
  none: {},
  low: { shadowColor: '#10142E', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  mid: { shadowColor: '#10142E', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  high: { shadowColor: '#10142E', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
} as const;

// ---- WCAG contrast ----
function lin(v: number) { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Pairs that must meet WCAG AA (4.5:1 for text). Used by tests/theme.test.ts. */
export const CONTRAST_PAIRS: [keyof Colors, keyof Colors][] = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surfaceAlt'], ['textMuted', 'bg'], ['textMuted', 'surface'], ['textFaint', 'surface'], ['textFaint', 'bg'],
  ['onPrimary', 'primary'], ['onPrimarySoft', 'primarySoft'], ['primary', 'surface'], ['primary', 'bg'],
  ['onSuccessSoft', 'successSoft'], ['onWarningSoft', 'warningSoft'], ['onDangerSoft', 'dangerSoft'],
  ['success', 'surface'], ['warning', 'surface'], ['danger', 'surface'],
];

/** Stable avatar tint per name, drawn from the brand hues. */
const AVATAR_HUES = ['#4338CA', '#7C3AED', '#0891B2', '#059669', '#B45309', '#DC4A47', '#2563EB', '#C026D3'];
export function avatarColor(seed: string): string {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}
export const TAB_SPACE = 104; // bottom padding so content clears the floating tab bar
