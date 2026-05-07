import jsPDF from "jspdf";

import type { Afiliado } from "../esquemas";

interface ImagePayload {
  dataUrl: string;
  width: number;
  height: number;
  format: "JPEG" | "PNG" | "WEBP";
}

export interface DpiUrls {
  frontal: string | null;
  reverso: string | null;
}

const fetchImageAsDataUrl = async (url: string): Promise<ImagePayload> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la imagen.");
  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new window.Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Imagen inválida."));
      img.src = dataUrl;
    },
  );

  const mime = blob.type.toLowerCase();
  const format: ImagePayload["format"] = mime.includes("png")
    ? "PNG"
    : mime.includes("webp")
      ? "WEBP"
      : "JPEG";

  return { dataUrl, format, ...dimensions };
};

const MM_TO_PT = 2.8346;
const CARD_W = 85.6 * MM_TO_PT;
const CARD_H = 54 * MM_TO_PT;

const GAP_PT = 72;

interface CardLayout {
  cx: number;
  frontalY: number;
  reversalY: number;
}

const getLayout = (pageWidth: number, pageHeight: number): CardLayout => {
  const cx = pageWidth / 2;
  const totalH = CARD_H * 2 + GAP_PT;
  const startY = (pageHeight - totalH) / 2;
  return { cx, frontalY: startY, reversalY: startY + CARD_H + GAP_PT };
};

const drawCardImg = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cardY: number,
  scale: number,
) => {
  const cardW = CARD_W * scale;
  const cardH = CARD_H * scale;
  const ratio = img.naturalWidth / img.naturalHeight;
  let drawW = cardW;
  let drawH = drawW / ratio;
  if (drawH > cardH) {
    drawH = cardH;
    drawW = drawH * ratio;
  }
  const x = cx - drawW / 2;
  const y = cardY + (cardH - drawH) / 2;
  ctx.drawImage(img, x, y, drawW, drawH);
};

export async function generarDpiPdf(afiliado: Afiliado, dpiUrls: DpiUrls) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { cx, frontalY, reversalY } = getLayout(pageWidth, pageHeight);

  const drawCard = async (url: string | null, cardY: number) => {
    if (!url) return;
    try {
      const img = await fetchImageAsDataUrl(url);
      const ratio = img.width / img.height;
      let drawW = CARD_W;
      let drawH = drawW / ratio;
      if (drawH > CARD_H) {
        drawH = CARD_H;
        drawW = drawH * ratio;
      }
      pdf.addImage(
        img.dataUrl,
        img.format,
        cx - drawW / 2,
        cardY + (CARD_H - drawH) / 2,
        drawW,
        drawH,
        undefined,
        "FAST",
      );
    } catch (e) {
      console.error("No se pudo agregar imagen al PDF:", e);
    }
  };

  await drawCard(dpiUrls.frontal, frontalY);
  await drawCard(dpiUrls.reverso, reversalY);

  const safeName = `${afiliado.nombres}_${afiliado.apellidos}`
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");
  pdf.save(`dpi_${safeName || afiliado.id}.pdf`);
}

export async function generarDpiImg(afiliado: Afiliado, dpiUrls: DpiUrls) {
  const SCALE = 4;
  const PAGE_W_PT = 612;
  const PAGE_H_PT = 792;

  const canvasW = Math.round(PAGE_W_PT * SCALE);
  const canvasH = Math.round(PAGE_H_PT * SCALE);

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear canvas.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const { cx, frontalY, reversalY } = getLayout(PAGE_W_PT, PAGE_H_PT);
  const cxPx = cx * SCALE;

  const loadHTMLImage = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Imagen inválida."));
      img.src = dataUrl;
    });

  const drawSide = async (url: string | null, cardY: number) => {
    if (!url) return;
    try {
      const payload = await fetchImageAsDataUrl(url);
      const htmlImg = await loadHTMLImage(payload.dataUrl);
      drawCardImg(ctx, htmlImg, cxPx, cardY * SCALE, SCALE);
    } catch (e) {
      console.error("No se pudo dibujar imagen:", e);
    }
  };

  await drawSide(dpiUrls.frontal, frontalY);
  await drawSide(dpiUrls.reverso, reversalY);

  const safeName = `${afiliado.nombres}_${afiliado.apellidos}`
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Error al exportar imagen."))),
      "image/png",
    ),
  );

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = `dpi_${safeName || afiliado.id}.png`;
  a.href = objectUrl;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
