import { TarotCard } from "./types";

const W = 1080;
const H = 1920;

// PRD §6.1 palette.
const INK = "#0b0e1a";
const INK_RAISED = "#12162a";
const GOLD = "#c9a96e";
const GOLD_BRIGHT = "#e4c894";
const MOON = "#f4f1ea";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Renders the 1080×1920 shareable card image (PRD §6.4) into the given canvas:
 * dark ground, the drawn card face, its name, the affirmation, and the brand watermark.
 */
export async function renderShareCard(
  canvas: HTMLCanvasElement,
  card: TarotCard,
  orientation: "upright" | "reversed",
): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  // Background gradient.
  const bg = ctx.createRadialGradient(W / 2, H * 0.38, 100, W / 2, H * 0.5, H * 0.7);
  bg.addColorStop(0, INK_RAISED);
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Gold border frame.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.globalAlpha = 1;

  // Header brand mark.
  ctx.fillStyle = GOLD;
  ctx.textAlign = "center";
  ctx.font = "500 40px Georgia, serif";
  ctx.fillText("W Y N D R A L O R E", W / 2, 150);

  // Card image.
  const cardW = 520;
  const cardH = (cardW / 400) * 640;
  const cardX = (W - cardW) / 2;
  const cardY = 260;
  try {
    const img = await loadImage(card.image);
    ctx.save();
    if (orientation === "reversed") {
      ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
    } else {
      ctx.drawImage(img, cardX, cardY, cardW, cardH);
    }
    ctx.restore();
  } catch {
    // If the SVG can't be rasterized, leave a placeholder frame rather than failing the share.
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(cardX, cardY, cardW, cardH);
  }

  // Card name.
  const nameY = cardY + cardH + 130;
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = "600 68px Georgia, serif";
  ctx.fillText(card.name, W / 2, nameY);

  // Orientation label.
  ctx.fillStyle = GOLD;
  ctx.font = "400 30px Georgia, serif";
  ctx.fillText(orientation === "upright" ? "UPRIGHT" : "REVERSED", W / 2, nameY + 56);

  // Affirmation.
  ctx.fillStyle = MOON;
  ctx.font = "italic 400 46px Georgia, serif";
  const affLines = wrapText(ctx, `“${card.affirmation}”`, W - 240);
  let affY = nameY + 160;
  for (const line of affLines) {
    ctx.fillText(line, W / 2, affY);
    affY += 62;
  }

  // Footer watermark.
  ctx.fillStyle = GOLD;
  ctx.font = "400 34px Georgia, serif";
  ctx.globalAlpha = 0.9;
  ctx.fillText("wyndralore.com", W / 2, H - 110);
  ctx.globalAlpha = 1;
}

export interface FortuneCardCard {
  image: string;
  orientation: "upright" | "reversed";
}

export interface FortuneCardOptions {
  spreadTitle: string;
  /** The distilled fortune keyword(s) shown large near the top. */
  keyword: string;
  cards: FortuneCardCard[];
  /** Pre-rendered QR image (data URL) encoding the share/referral link. */
  qrDataUrl: string;
  /** Human-readable link printed under the QR. */
  urlLabel: string;
}

/** Rounded-rect path helper (older canvas targets lack ctx.roundRect). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders the 1080×1920 "flaunt" fortune card: brand mark, spread name, the distilled fortune
 * keyword, a thumbnail grid of the actual cards drawn, and a QR (encoding the sharer's referral
 * link) so a screenshot posted to TikTok/Instagram doubles as an invite. Same black-gold palette
 * as the site.
 */
export async function renderFortuneCard(canvas: HTMLCanvasElement, opts: FortuneCardOptions): Promise<void> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const bg = ctx.createRadialGradient(W / 2, H * 0.36, 120, W / 2, H * 0.5, H * 0.72);
  bg.addColorStop(0, INK_RAISED);
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";

  // Brand mark + spread name.
  ctx.fillStyle = GOLD;
  ctx.font = "500 40px Georgia, serif";
  ctx.fillText("W Y N D R A L O R E", W / 2, 156);
  ctx.font = "400 30px Georgia, serif";
  ctx.globalAlpha = 0.85;
  ctx.fillText(opts.spreadTitle.toUpperCase(), W / 2, 214);
  ctx.globalAlpha = 1;

  // Distilled fortune keyword — the hero line.
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.font = "600 76px Georgia, serif";
  const kwLines = wrapText(ctx, opts.keyword, W - 260);
  let kwY = 360;
  for (const line of kwLines.slice(0, 3)) {
    ctx.fillText(line, W / 2, kwY);
    kwY += 92;
  }

  // Thumbnail grid of the drawn cards.
  const n = opts.cards.length;
  const perRow = Math.min(n, 5);
  const rows = Math.ceil(n / perRow);
  const gap = 26;
  const maxThumbW = 220;
  const usable = W - 260;
  const thumbW = Math.min(maxThumbW, (usable - (perRow - 1) * gap) / perRow);
  const thumbH = thumbW * (8 / 5);
  const gridTop = Math.max(kwY + 40, 640);
  const gridH = rows * thumbH + (rows - 1) * gap;

  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const cardsInRow = Math.min(perRow, n - row * perRow);
    const rowW = cardsInRow * thumbW + (cardsInRow - 1) * gap;
    const x = (W - rowW) / 2 + col * (thumbW + gap);
    const y = gridTop + row * (thumbH + gap);
    try {
      const img = await loadImage(opts.cards[i]!.image);
      ctx.save();
      if (opts.cards[i]!.orientation === "reversed") {
        ctx.translate(x + thumbW / 2, y + thumbH / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -thumbW / 2, -thumbH / 2, thumbW, thumbH);
      } else {
        ctx.drawImage(img, x, y, thumbW, thumbH);
      }
      ctx.restore();
    } catch {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, thumbW, thumbH);
    }
  }

  // QR tile (light background so it stays scannable on the dark card) + caption.
  const qrSize = 240;
  const qrX = (W - qrSize) / 2;
  const qrY = Math.min(gridTop + gridH + 120, H - 400);
  ctx.fillStyle = MOON;
  roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 24);
  ctx.fill();
  try {
    const qr = await loadImage(opts.qrDataUrl);
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } catch {
    /* leave the light tile if QR fails */
  }

  ctx.fillStyle = MOON;
  ctx.font = "italic 400 34px Georgia, serif";
  ctx.fillText("Scan for your own reading", W / 2, qrY + qrSize + 76);
  ctx.fillStyle = GOLD;
  ctx.font = "400 34px Georgia, serif";
  ctx.fillText(opts.urlLabel, W / 2, qrY + qrSize + 128);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas"));
    }, "image/png");
  });
}
