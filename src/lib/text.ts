/**
 * Diacritic-insensitive substring matching that can still report positions in
 * the *original* string, so search results can highlight the matched run.
 *
 * Folding "Zürich" to "zurich" can change string length, so we build an index
 * map from each folded character back to the character it came from.
 */

interface Folded {
  folded: string;
  /** map[i] = index in the source string that produced folded[i]. */
  map: number[];
}

export function foldWithMap(input: string): Folded {
  const chars: string[] = [];
  const map: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const folded = input[i]
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    for (const char of folded) {
      chars.push(char);
      map.push(i);
    }
  }

  return { folded: chars.join(""), map };
}

export function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export interface TextSegment {
  text: string;
  match: boolean;
}

/**
 * Splits `text` into matched / unmatched segments for the first occurrence of
 * `query`. Returns a single unmatched segment when there is no hit.
 */
export function highlightSegments(text: string, query: string): TextSegment[] {
  const needle = fold(query.trim());
  if (!needle) return [{ text, match: false }];

  const { folded, map } = foldWithMap(text);
  const at = folded.indexOf(needle);
  if (at === -1) return [{ text, match: false }];

  const start = map[at];
  const end = map[Math.min(at + needle.length - 1, map.length - 1)] + 1;
  if (start === undefined || end === undefined || end <= start) {
    return [{ text, match: false }];
  }

  const segments: TextSegment[] = [];
  if (start > 0) segments.push({ text: text.slice(0, start), match: false });
  segments.push({ text: text.slice(start, end), match: true });
  if (end < text.length) segments.push({ text: text.slice(end), match: false });
  return segments;
}
