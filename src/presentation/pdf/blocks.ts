import { sum } from "../../domain/stats.ts";
import { svgSize } from "../charts/svg.ts";
import type { PdfCanvas } from "./pdf-canvas.ts";
import type { MetricsTable } from "./report-content.ts";
import {
  CONTENT_WIDTH as CW,
  GROWTH_WIDTH,
  GROWTH_X,
  INK,
  PAGE,
  STATUS,
  TABLE_COLUMNS as COLS,
  TREND_WIDTH,
} from "./theme.ts";

export interface Block {
  height(scale: number): number;
  draw(y: number, scale: number): void;
}

export function titleBlock(c: PdfCanvas, title: string, subtitle: string): Block {
  return {
    height: (s) =>
      c.measure("Bold", 16 * s, title, CW) + c.measure("Body", 8.2 * s, subtitle, CW) + 8 * s,
    draw: (y, s) => {
      c.write("Bold", 16 * s, INK.primary, title, PAGE.mx, y, CW);
      c.write(
        "Body",
        8.2 * s,
        INK.muted,
        subtitle,
        PAGE.mx,
        y + c.measure("Bold", 16 * s, title, CW) + 1,
        CW,
      );
    },
  };
}

export function questionBlock(c: PdfCanvas, label: string, question: string): Block {
  return {
    height: (s) =>
      question
        ? c.measure("Bold", 8 * s, label, CW) + c.measure("Body", 8.8 * s, question, CW) + 6 * s
        : 0,
    draw: (y, s) => {
      if (!question) return;
      c.write("Bold", 8 * s, INK.muted, label.toUpperCase(), PAGE.mx, y, CW);
      c.write(
        "Body",
        8.8 * s,
        INK.secondary,
        question,
        PAGE.mx,
        y + c.measure("Bold", 8 * s, "Q", CW),
        CW,
      );
    },
  };
}

export function answerBlock(c: PdfCanvas, label: string, answer: string): Block {
  const inner = (s: number) =>
    c.measure("Bold", 8 * s, "A", CW - 24) + c.measure("Body", 9.8 * s, answer, CW - 24) + 16 * s;
  return {
    height: (s) => inner(s) + 8 * s,
    draw: (y, s) => {
      const h = inner(s);
      c.rect(PAGE.mx, y, CW, h, INK.box);
      c.rect(PAGE.mx, y, 3, h, INK.accent);
      c.write("Bold", 8 * s, INK.muted, label.toUpperCase(), PAGE.mx + 14, y + 8 * s, CW - 24);
      c.write(
        "Body",
        9.8 * s,
        INK.primary,
        answer,
        PAGE.mx + 14,
        y + 8 * s + c.measure("Bold", 8 * s, "A", CW - 24),
        CW - 24,
      );
    },
  };
}

export function metricsTableBlock(c: PdfCanvas, heading: string, table: MetricsTable): Block {
  const rowHeight = (cells: string[], font: "Cond" | "CondBold", size: number) =>
    Math.max(...cells.map((cell, i) => c.measure(font, size, cell, COLS[i] - 6))) + 5;
  return {
    height: (s) =>
      15 * s +
      rowHeight(table.header, "CondBold", 7.4 * s) +
      sum(table.rows.map((r) => rowHeight(r, "Cond", 7.8 * s))) +
      8 * s,
    draw: (y, s) => {
      c.write("Bold", 9.5 * s, INK.primary, heading, PAGE.mx, y, CW);
      let yy = y + 15 * s;
      const drawRow = (
        cells: string[],
        font: "Cond" | "CondBold",
        size: number,
        color: string,
        isHeader: boolean,
        confidence?: keyof typeof STATUS,
      ) => {
        const h = rowHeight(cells, font, size);
        let x = PAGE.mx;
        cells.forEach((cell, i) => {
          const last = i === cells.length - 1;
          if (last && confidence) {
            c.dot(x + 4, yy + size * 0.62, 2.6 * s, STATUS[confidence]); // status dot next to the verdict
            c.write(font, size, color, cell, x + 10, yy + 1, COLS[i] - 12);
          } else {
            c.write(font, size, color, cell, x + (i === 0 ? 0 : 3), yy + 1, COLS[i] - 6, {
              align: i === 0 || last ? "left" : "right",
            });
          }
          x += COLS[i];
        });
        yy += h;
        c.hline(PAGE.mx, PAGE.mx + CW, yy - 1.5, isHeader ? 0.8 : 0.4, INK.hairline);
      };
      drawRow(table.header, "CondBold", 7.4 * s, INK.muted, true);
      table.rows.forEach((r, i) =>
        drawRow(r, "Cond", 7.8 * s, INK.primary, false, table.confidence[i]),
      );
    },
  };
}

const chartTitleHeight = (s: number) => 13 * s;

export function chartPairBlock(
  c: PdfCanvas,
  titles: { trend: string; growth: string },
  svgs: { trend: (s: number) => string; growth: (s: number) => string },
): Block {
  return {
    height: (s) =>
      chartTitleHeight(s) + Math.max(svgSize(svgs.trend(s)).height, svgSize(svgs.growth(s)).height),
    draw: (y, s) => {
      c.write("Bold", 8 * s, INK.primary, titles.trend, PAGE.mx, y, TREND_WIDTH);
      c.write("Bold", 8 * s, INK.primary, titles.growth, GROWTH_X, y, GROWTH_WIDTH);
      c.svg(svgs.trend(s), PAGE.mx, y + chartTitleHeight(s));
      c.svg(svgs.growth(s), GROWTH_X, y + chartTitleHeight(s));
    },
  };
}

export function fullWidthChartBlock(
  c: PdfCanvas,
  title: string,
  svgAt: (s: number) => string,
): Block {
  return {
    height: (s) => chartTitleHeight(s) + svgSize(svgAt(s)).height,
    draw: (y, s) => {
      c.write("Bold", 8 * s, INK.primary, title, PAGE.mx, y, CW);
      c.svg(svgAt(s), PAGE.mx, y + chartTitleHeight(s));
    },
  };
}

function headingBlock(c: PdfCanvas, label: string): Block {
  return {
    height: (s) => 15 * s,
    draw: (y, s) => c.write("Bold", 9.5 * s, INK.primary, label, PAGE.mx, y, CW),
  };
}

function bulletsBlock(c: PdfCanvas, items: string[], size: number): Block {
  const itemHeight = (b: string, s: number) => c.measure("Body", size * s, b, CW - 12) + 2 * s;
  return {
    height: (s) => sum(items.map((b) => itemHeight(b, s))),
    draw: (y, s) => {
      let yy = y;
      for (const b of items) {
        c.dot(PAGE.mx + 3, yy + size * s * 0.55, 1.4 * s, INK.secondary);
        c.write("Body", size * s, INK.secondary, b, PAGE.mx + 12, yy, CW - 12);
        yy += itemHeight(b, s);
      }
    },
  };
}

export function sectionBlock(c: PdfCanvas, label: string, items: string[], size = 8.4): Block {
  const heading = headingBlock(c, label);
  const bullets = bulletsBlock(c, items, size);
  return {
    height: (s) => heading.height(s) + bullets.height(s) + 7 * s,
    draw: (y, s) => {
      heading.draw(y, s);
      bullets.draw(y + heading.height(s), s);
    },
  };
}

export function methodBlock(
  c: PdfCanvas,
  heading: string,
  text: string,
  verifyLabel: string,
  links: Array<[string, string]>,
): Block {
  return {
    height: (s) => 13 * s + c.measure("Body", 6.9 * s, text, CW) + 12 * s,
    draw: (y, s) => {
      c.hline(PAGE.mx, PAGE.mx + CW, y, 0.5, INK.hairline);
      c.write("Bold", 7.5 * s, INK.muted, heading.toUpperCase(), PAGE.mx, y + 4 * s, CW);
      c.write("Body", 6.9 * s, INK.muted, text, PAGE.mx, y + 13 * s, CW);
      const linksY = y + 13 * s + c.measure("Body", 6.9 * s, text, CW) + 2;
      c.inline("Body", 6.9 * s, PAGE.mx, linksY, [
        { text: `${verifyLabel}: `, color: INK.muted },
        ...links.map(([lang, url]) => ({
          text: `pageviews.wmcloud.org (${lang})  `,
          color: INK.accent,
          link: url,
        })),
      ]);
    },
  };
}
