/** Joins class names, skipping falsy values. Intentionally tiny. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
