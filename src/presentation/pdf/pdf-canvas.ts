import { createWriteStream, type WriteStream } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import { svgSize } from "../charts/svg.ts";

const require = createRequire(import.meta.url);

export type FontName = "Body" | "Bold" | "Cond" | "CondBold";

const FONT_FILES: Record<FontName, string> = {
  Body: "DejaVuSans.ttf",
  Bold: "DejaVuSans-Bold.ttf",
  Cond: "DejaVuSansCondensed.ttf",
  CondBold: "DejaVuSansCondensed-Bold.ttf",
};

const NO_LIGATURES = { liga: false, clig: false } as unknown as PDFKit.Mixins.OpenTypeFeatures[];

export interface InlinePiece {
  text: string;
  color: string;
  link?: string;
}

export class PdfCanvas {
  private readonly doc: PDFKit.PDFDocument;
  private readonly stream: WriteStream;

  constructor(file: string, info: { Title: string; Author: string; Subject: string }) {
    this.doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, info });
    for (const [name, fontFile] of Object.entries(FONT_FILES))
      this.doc.registerFont(name, require.resolve(`dejavu-fonts-ttf/ttf/${fontFile}`));
    this.stream = createWriteStream(file);
    this.doc.pipe(this.stream);
  }

  measure(font: FontName, size: number, text: string, width: number): number {
    this.doc.font(font).fontSize(size);
    return this.doc.heightOfString(text, { width, lineGap: size * 0.18, features: NO_LIGATURES });
  }

  write(
    font: FontName,
    size: number,
    color: string,
    text: string,
    x: number,
    y: number,
    width: number,
    extra: PDFKit.Mixins.TextOptions = {},
  ): void {
    this.doc
      .font(font)
      .fontSize(size)
      .fillColor(color)
      .text(text, x, y, { width, lineGap: size * 0.18, features: NO_LIGATURES, ...extra });
  }

  inline(font: FontName, size: number, x: number, y: number, pieces: InlinePiece[]): void {
    this.doc.font(font).fontSize(size);
    let cx = x;
    for (const p of pieces) {
      const options = p.link
        ? { link: p.link, lineBreak: false, underline: false, features: NO_LIGATURES }
        : { lineBreak: false, features: NO_LIGATURES };
      this.doc.fillColor(p.color).text(p.text, cx, y, options);
      cx += this.doc.widthOfString(p.text);
    }
  }

  dot(x: number, y: number, radius: number, color: string): void {
    this.doc.circle(x, y, radius).fill(color);
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.doc.rect(x, y, w, h).fill(color);
  }

  hline(x1: number, x2: number, y: number, width: number, color: string): void {
    this.doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
  }

  svg(svgText: string, x: number, y: number): void {
    const { width, height } = svgSize(svgText);
    SVGtoPDF(this.doc, svgText, x, y, {
      width,
      height,
      assumePt: true,
      fontCallback: (_family, bold) => (bold ? "Bold" : "Body"),
    });
  }

  get cursorY(): number {
    return this.doc.y;
  }

  pageCount(): number {
    return this.doc.bufferedPageRange().count;
  }

  async finish(): Promise<void> {
    this.doc.end();
    await new Promise<void>((res, rej) => {
      this.stream.on("finish", () => res());
      this.stream.on("error", rej);
    });
  }
}
