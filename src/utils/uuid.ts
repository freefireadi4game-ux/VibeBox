/**
 * UUID utility functions for Postgres / Supabase compatibility.
 * Ensures all entity IDs conform to standard UUID v4 format.
 */

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deterministically transforms any string (e.g. 'seed-1', 'song-1789720160288-e86x18')
 * into a valid, consistent UUID v4 format so Supabase Postgres UUID columns never error out with 22P02.
 */
export function toValidUUID(input: string | null | undefined): string {
  if (!input) return generateUUID();
  const trimmed = String(input).trim();
  if (isValidUUID(trimmed)) return trimmed.toLowerCase();

  // Deterministic 128-bit hash algorithm from string
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x811c9dc5, h4 = 0x9e3779b9;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3812015801);
    h4 = Math.imul(h4 ^ ch, 2246822507);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = ((h2 >>> 16) & 0xffff).toString(16).padStart(4, '0');
  const p3 = '4' + ((h2 & 0x0fff)).toString(16).padStart(3, '0'); // v4 marker
  const p4 = ((8 | ((h3 >>> 28) & 3))).toString(16) + ((h3 & 0x0fff)).toString(16).padStart(3, '0'); // variant
  const p5 = (h4 >>> 0).toString(16).padStart(8, '0') + ((h3 >>> 12) & 0xffff).toString(16).padStart(4, '0');

  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}
