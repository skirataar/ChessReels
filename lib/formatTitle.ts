/**
 * Turns raw puzzle/theme slugs into human-readable Title Case.
 *
 * Examples:
 *   "mate_in_2"       -> "Mate In 2"
 *   "back-rank-mate"  -> "Back Rank Mate"
 *   "mateIn2"         -> "Mate In 2"
 *   "sicilian_defense"-> "Sicilian Defense"
 */
export function formatTitle(raw: string | null | undefined): string {
  if (!raw) return "";

  return raw
    // Slugs use hyphens/underscores as word separators.
    .replace(/[-_]+/g, " ")
    // Lichess-style camelCase themes (e.g. "backRankMate").
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Normalise whitespace before casing each word.
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => {
      if (!word) return word;
      // Leave chess notation / punctuation-only tokens intact when they are
      // already deliberately cased (e.g. "Nf3", "O-O"), otherwise title-case.
      if (/^[A-Z0-9]{2,}$/.test(word) || !/[a-zA-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(" ");
}
