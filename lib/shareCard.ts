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

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas"));
    }, "image/png");
  });
}
