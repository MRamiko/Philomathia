// Georgia first; when it has no listing, nearby countries with streaming data are tried in this order.
export const WATCH_FALLBACK = ['TR', 'DE', 'GB', 'US'] as const;
export const WATCH_REGIONS = ['GE', ...WATCH_FALLBACK] as const;
export const REGION_NAMES: Record<string, string> = { GE: 'Georgia', TR: 'Turkey', DE: 'Germany', GB: 'United Kingdom', US: 'United States' };
