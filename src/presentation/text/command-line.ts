/** Quote a shell argument only when needed, so suggested commands stay short and copy-pastable. */
export function quoteArg(s: string): string {
  return /^[\w.,:=\-/]+$/.test(s) ? s : `"${s.replace(/"/g, '\\"')}"`;
}

/** Quote a value for the "Next step" command in summary.md (double quotes inside become single). */
export function quoteValue(s: string): string {
  return `"${s.replace(/"/g, "'")}"`;
}
