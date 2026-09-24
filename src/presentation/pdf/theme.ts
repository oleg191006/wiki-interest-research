export const INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  hairline: "#e1e0d9",
  box: "#f4f3ef",
  accent: "#2a78d6",
};
export const STATUS = { high: "#0ca30c", medium: "#fab219", low: "#d03b3b" };

export const PAGE = { w: 595.28, h: 841.89, mx: 34, top: 30, bottom: 26 };
export const CONTENT_WIDTH = PAGE.w - 2 * PAGE.mx;
export const AVAILABLE_HEIGHT = PAGE.h - PAGE.top - PAGE.bottom;

// Trend and growth charts sit side by side.
export const TREND_WIDTH = 318;
export const CHART_GAP = 10;
export const GROWTH_WIDTH = CONTENT_WIDTH - TREND_WIDTH - CHART_GAP;
export const GROWTH_X = PAGE.mx + TREND_WIDTH + CHART_GAP;

// Column widths of the metrics table.
export const TABLE_COLUMNS = [118, 60, 110, 52, 58, 42, 87];
