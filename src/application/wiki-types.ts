export type Access = "all-access" | "desktop" | "mobile-web" | "mobile-app";

export interface Entity {
  qid: string;
  labels: Record<string, string>;
  descriptions: Record<string, string>;
  sitelinks: Record<string, string>;
}

export interface SearchHit {
  qid: string;
  label: string;
  description: string;
}

export interface PageInfo {
  lang: string;
  requested: string;
  title: string;
  exists: boolean;
  redirectedFrom?: string;
  qid?: string;
  disambiguation: boolean;
  created?: string;
  views60?: number;
}

export interface RedirectStats {
  count: number;
  views60: number;
  top: Array<{ title: string; views60: number }>;
}

export interface SearchResultPage {
  title: string;
  qid?: string;
  disambiguation: boolean;
  viewsPerDay?: number;
}

export interface CountryShare {
  country: string;
  share: number;
}

export function entityLabel(e: Entity | undefined, lang: string): string {
  if (!e) return "";
  return e.labels[lang] ?? e.labels.en ?? Object.values(e.labels)[0] ?? e.qid;
}

export function wikipediaCount(e: Entity): number {
  return Object.keys(e.sitelinks).filter(
    (k) => k.endsWith("wiki") && k !== "commonswiki" && k !== "specieswiki",
  ).length;
}
