export const AVAILABLE_ICON_KEYS = [
  'SAILOR_ICONS-02.svg',
  'SAILOR_ICONS-03.svg',
  'SAILOR_ICONS-04.svg',
  'SAILOR_ICONS-05.svg',
  'SAILOR_ICONS-06.svg',
  'SAILOR_ICONS-07.svg',
  'SAILOR_ICONS-08.svg',
  'SAILOR_ICONS-09.svg',
  'SAILOR_ICONS-10.svg',
  'SAILOR_ICONS-11.svg',
  'SAILOR_ICONS-12.svg',
] as const;

export const DEFAULT_ICON_KEY = AVAILABLE_ICON_KEYS[0];

export const AVAILABLE_ICON_KEY_SET: ReadonlySet<string> = new Set(AVAILABLE_ICON_KEYS);

export function isKnownIconKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && AVAILABLE_ICON_KEY_SET.has(value);
}

export function resolveIconKey(value: string | null | undefined): string {
  return isKnownIconKey(value) ? value : DEFAULT_ICON_KEY;
}

export function iconSrcForKey(value: string | null | undefined): string {
  return `/icons/${encodeURIComponent(resolveIconKey(value))}`;
}
