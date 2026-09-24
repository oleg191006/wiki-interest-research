export type UiLang = "en" | "uk";

export function parseUiLang(v: string | undefined): UiLang {
  const x = (v ?? "en").toLowerCase();
  return x === "uk" || x === "ua" ? "uk" : "en";
}

export function languageName(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
