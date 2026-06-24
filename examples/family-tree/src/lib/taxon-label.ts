/**
 * Pure ltree-label validation, shared by the graft form (client) and the
 * `graftTaxon` server function.
 *
 * A PostgreSQL ltree label is a sequence of `A-Za-z0-9_` characters; ltree
 * additionally caps a single label at 255 bytes. This viewer narrows that to a
 * scientific-name convention — every label must *start* with a letter (so the
 * label reads as a clade/`Genus_epithet` name, never a bare number) — matching
 * the regex: `^[A-Za-z][A-Za-z0-9_]*$`.
 *
 * Kept free of the DB runtime so the form can validate keystroke-by-keystroke
 * in the browser and the server can re-check the same rule before inserting.
 */

export const LABEL_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
export const MAX_LABEL_LENGTH = 255;

/**
 * Returns a human-readable error string when `label` is not a valid ltree label
 * under the viewer's convention, or `null` when it is acceptable.
 */
export function validateTaxonLabel(label: string): string | null {
  if (!label) return "Enter a label.";
  if (label.length > MAX_LABEL_LENGTH) {
    return `Label must be ${MAX_LABEL_LENGTH} characters or fewer.`;
  }
  if (!LABEL_PATTERN.test(label)) {
    return "Use letters, digits, and underscores only; start with a letter (e.g. Homo_longaevus).";
  }
  return null;
}
