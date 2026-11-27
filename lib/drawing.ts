// Elements live in an unbounded "world" coordinate space shared by every client.
// Each client looks at it through its own camera (View), so the board is infinite
// and the visible area simply matches the screen.
export const CANVAS_BACKGROUND = "#ffffff";

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };

// World coordinate shown at the top-left corner of the screen, and the zoom factor.
export type View = { x: number; y: number; zoom: number };
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

export const toWorld = (view: View, screen: Point): Point => ({
  x: screen.x / view.zoom + view.x,
  y: screen.y / view.zoom + view.y,
});

export const toScreen = (view: View, world: Point): Point => ({
  x: (world.x - view.x) * view.zoom,
  y: (world.y - view.y) * view.zoom,
});

// Zoom so the world point under `anchor` (screen coords) stays put.
export function zoomAt(view: View, anchor: Point, zoom: number): View {
  const next = clampZoom(zoom);
  const world = toWorld(view, anchor);
  return { zoom: next, x: world.x - anchor.x / next, y: world.y - anchor.y / next };
}

export type Tool =
  | "hand"
  | "pen"
  | "highlighter"
  | "eraser"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "text"
  | "fill";

type Base = { id: string; color: string; size: number };

export type StrokeElement = Base & {
  kind: "stroke";
  points: Point[];
  opacity: number;
};
export type ShapeElement = Base & {
  kind: "line" | "arrow" | "rect" | "ellipse";
  from: Point;
  to: Point;
};
export type TextElement = Base & { kind: "text"; at: Point; text: string };
export type FillElement = Base & { kind: "fill"; at: Point };
export type DrawElement = StrokeElement | ShapeElement | TextElement | FillElement;

export type RoomUser = { id: string; name: string; image: string | null };

export type Member = {
  connectionId: string;
  userId: string | null;
  name: string;
  image: string | null;
};

export type ServerMessage =
  | { type: "init"; connectionId: string; elements: DrawElement[] }
  | { type: "add"; element: DrawElement }
  | { type: "append"; id: string; points: Point[] }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "presence"; count: number; users?: Member[] }
  | { type: "cursor"; connectionId: string; x: number; y: number }
  | { type: "cursor-leave"; connectionId: string }
  | { type: "denied" };

export type ClientMessage =
  | { type: "join"; user: RoomUser }
  | { type: "add"; element: DrawElement }
  | { type: "append"; id: string; points: Point[] }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "cursor"; x: number; y: number }
  | { type: "cursor-leave" };

export const textFontSize = (size: number) => 16 + size * 2;
const FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, sans-serif";

export function newId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function arrowHead(from: Point, to: Point, size: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.max(14, size * 3.5);
  return [-1, 1].map((side) => ({
    x: to.x - length * Math.cos(angle + side * (Math.PI / 7)),
    y: to.y - length * Math.sin(angle + side * (Math.PI / 7)),
  }));
}

// Measuring text needs a context; one shared offscreen canvas is enough.
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(el: TextElement) {
  if (!measureCtx && typeof document !== "undefined") {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return el.text.length * textFontSize(el.size) * 0.6;
  measureCtx.font = `600 ${textFontSize(el.size)}px ${FONT_FAMILY}`;
  return measureCtx.measureText(el.text).width;
}

export function elementBounds(el: DrawElement): Box | null {
  switch (el.kind) {
    case "stroke": {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of el.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      if (!Number.isFinite(minX)) return null;
      const r = el.size / 2;
      return { x: minX - r, y: minY - r, width: maxX - minX + el.size, height: maxY - minY + el.size };
    }
    case "line":
    case "arrow":
    case "rect":
    case "ellipse": {
      const r = el.kind === "arrow" ? Math.max(14, el.size * 3.5) : el.size / 2;
      const x = Math.min(el.from.x, el.to.x) - r;
      const y = Math.min(el.from.y, el.to.y) - r;
      return {
        x,
        y,
        width: Math.abs(el.to.x - el.from.x) + r * 2,
        height: Math.abs(el.to.y - el.from.y) + r * 2,
      };
    }
    case "text":
      return { x: el.at.x, y: el.at.y, width: textWidth(el), height: textFontSize(el.size) * 1.2 };
    case "fill":
      return { x: el.at.x, y: el.at.y, width: 0, height: 0 };
  }
}

export function sceneBounds(elements: Iterable<DrawElement>): Box | null {
  let box: Box | null = null;
  for (const el of Array.from(elements)) {
    const b = elementBounds(el);
    if (!b) continue;
    if (!box) {
      box = { ...b };
      continue;
    }
    const right = Math.max(box.x + box.width, b.x + b.width);
    const bottom = Math.max(box.y + box.height, b.y + b.height);
    box.x = Math.min(box.x, b.x);
    box.y = Math.min(box.y, b.y);
    box.width = right - box.x;
    box.height = bottom - box.y;
  }
  return box;
}

function tracePolyline(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.moveTo(points[0].x, points[0].y);
  // Curve through midpoints so fast strokes don't look jagged.
  for (let i = 1; i < points.length - 1; i++) {
    const mid = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

// Draws any element except fills, which only exist inside the fill raster.
export function drawElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
  if (el.kind === "fill") return;
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (el.kind) {
    case "stroke": {
      ctx.globalAlpha = el.opacity;
      if (el.points.length === 1) {
        ctx.beginPath();
        ctx.arc(el.points[0].x, el.points[0].y, el.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        tracePolyline(ctx, el.points);
        ctx.stroke();
      }
      break;
    }
    case "line":
    case "arrow": {
      ctx.beginPath();
      ctx.moveTo(el.from.x, el.from.y);
      ctx.lineTo(el.to.x, el.to.y);
      if (el.kind === "arrow") {
        const [left, right] = arrowHead(el.from, el.to, el.size);
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(el.to.x, el.to.y);
        ctx.lineTo(right.x, right.y);
      }
      ctx.stroke();
      break;
    }
    case "rect": {
      ctx.strokeRect(
        Math.min(el.from.x, el.to.x),
        Math.min(el.from.y, el.to.y),
        Math.abs(el.to.x - el.from.x),
        Math.abs(el.to.y - el.from.y)
      );
      break;
    }
    case "ellipse": {
      ctx.beginPath();
      ctx.ellipse(
        (el.from.x + el.to.x) / 2,
        (el.from.y + el.to.y) / 2,
        Math.abs(el.to.x - el.from.x) / 2,
        Math.abs(el.to.y - el.from.y) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      break;
    }
    case "text": {
      ctx.font = `600 ${textFontSize(el.size)}px ${FONT_FAMILY}`;
      ctx.textBaseline = "top";
      ctx.fillText(el.text, el.at.x, el.at.y);
      break;
    }
  }
  ctx.restore();
}

// Pixels whose RGBA channels differ from the clicked colour by at most this (summed)
// still get filled, so anti-aliased line edges don't leave a halo.
const FILL_TOLERANCE = 120;

function parseColor(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = "#000";
  ctx.fillStyle = color; // the canvas normalises any CSS colour to #rrggbb
  const hex = String(ctx.fillStyle).replace("#", "");
  const n = parseInt(hex.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

// Scanline flood fill over the pixels rendered so far. On an infinite board an
// open area has no edge, so a fill that leaks to the raster border is discarded:
// only enclosed regions get filled. Returns whether anything was painted.
function floodFill(ctx: CanvasRenderingContext2D, x0: number, y0: number, color: string) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return false;

  const image = ctx.getImageData(0, 0, W, H);
  const data = image.data;
  const start = (y0 * W + x0) * 4;
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const fill = parseColor(ctx, color);
  if (target.every((v, i) => Math.abs(v - fill[i]) < 3)) return false;

  const done = new Uint8Array(W * H);
  const matches = (x: number, y: number) => {
    const p = y * W + x;
    if (done[p]) return false;
    const i = p * 4;
    return (
      Math.abs(data[i] - target[0]) +
        Math.abs(data[i + 1] - target[1]) +
        Math.abs(data[i + 2] - target[2]) +
        Math.abs(data[i + 3] - target[3]) <=
      FILL_TOLERANCE
    );
  };

  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (!matches(x, y)) continue;
    let left = x;
    while (left > 0 && matches(left - 1, y)) left--;
    let right = x;
    while (right < W - 1 && matches(right + 1, y)) right++;
    if (left === 0 || right === W - 1 || y === 0 || y === H - 1) return false;
    for (let cx = left; cx <= right; cx++) {
      const p = y * W + cx;
      done[p] = 1;
      data.set(fill, p * 4);
    }
    // Seed the rows above and below once per contiguous run.
    for (const ny of [y - 1, y + 1]) {
      let inRun = false;
      for (let cx = left; cx <= right; cx++) {
        const ok = matches(cx, ny);
        if (ok && !inRun) stack.push(cx, ny);
        inRun = ok;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return true;
}

// Flood fills work on pixels, so everything up to the last fill is rasterised once
// in world space (independent of anyone's camera, so every client gets the same
// result) and cached; only what came after it is drawn as vectors each frame.
type Raster = { key: string; canvas: HTMLCanvasElement; box: Box; applied: Set<string> };
const RASTER_PADDING = 8;
const RASTER_MAX_PIXELS = 4_000_000;
let rasterCache: Raster | null = null;

function rasterKey(list: DrawElement[], lastFill: number) {
  let points = 0;
  for (let i = 0; i <= lastFill; i++) {
    const el = list[i];
    if (el.kind === "stroke") points += el.points.length;
  }
  return `${lastFill}:${list[0].id}:${list[lastFill].id}:${points}`;
}

function buildRaster(list: DrawElement[], lastFill: number): Raster | null {
  const key = rasterKey(list, lastFill);
  if (rasterCache?.key === key) return rasterCache;

  const prefix = list.slice(0, lastFill + 1);
  const bounds = sceneBounds(prefix);
  if (!bounds) return null;
  const box = {
    x: bounds.x - RASTER_PADDING,
    y: bounds.y - RASTER_PADDING,
    width: bounds.width + RASTER_PADDING * 2,
    height: bounds.height + RASTER_PADDING * 2,
  };
  // Up to 2x resolution for crisp fills when zoomed in, capped for memory.
  const scale = Math.min(2, Math.sqrt(RASTER_MAX_PIXELS / (box.width * box.height)));
  const canvas = rasterCache?.canvas ?? document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(box.width * scale));
  canvas.height = Math.max(1, Math.ceil(box.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale);
  const applied = new Set<string>();
  for (const el of prefix) {
    if (el.kind !== "fill") {
      drawElement(ctx, el);
      continue;
    }
    const px = Math.floor((el.at.x - box.x) * scale);
    const py = Math.floor((el.at.y - box.y) * scale);
    if (floodFill(ctx, px, py, el.color)) applied.add(el.id);
  }

  rasterCache = { key, canvas, box, applied };
  return rasterCache;
}

// Whether a fill at this spot would paint an enclosed region (and not leak out).
export function fillWouldApply(elements: Iterable<DrawElement>, fill: FillElement) {
  const list = [...Array.from(elements), fill];
  return buildRaster(list, list.length - 1)?.applied.has(fill.id) ?? false;
}

// Renders the scene through `view`. `pixelRatio` maps CSS pixels to canvas pixels.
export function renderScene(
  ctx: CanvasRenderingContext2D,
  elements: Iterable<DrawElement>,
  preview: DrawElement | null,
  view: View,
  pixelRatio: number
) {
  const list = Array.from(elements);
  let lastFill = -1;
  list.forEach((el, i) => {
    if (el.kind === "fill") lastFill = i;
  });

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const k = pixelRatio * view.zoom;
  ctx.setTransform(k, 0, 0, k, -view.x * k, -view.y * k);

  let start = 0;
  if (lastFill >= 0) {
    const raster = buildRaster(list, lastFill);
    if (raster) {
      ctx.drawImage(raster.canvas, raster.box.x, raster.box.y, raster.box.width, raster.box.height);
      start = lastFill + 1;
    }
  }
  for (let i = start; i < list.length; i++) drawElement(ctx, list[i]);
  if (preview) drawElement(ctx, preview);
}

// Renders everything to a standalone canvas cropped to the drawing, for downloads.
export function exportCanvas(elements: Iterable<DrawElement>, padding = 32, scale = 2) {
  const list = Array.from(elements);
  const bounds = sceneBounds(list);
  if (!bounds) return null;
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  // Keep huge boards within what browsers can allocate.
  const ratio = Math.min(scale, Math.sqrt(16_000_000 / (width * height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  renderScene(ctx, list, null, { x: bounds.x - padding, y: bounds.y - padding, zoom: 1 }, ratio);
  return canvas;
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Static SVG version of a drawing, used for room thumbnails.
export function elementsToSvg(elements: DrawElement[]) {
  const bounds = sceneBounds(elements) ?? {
    x: 0,
    y: 0,
    width: 1600,
    height: 1000,
  };
  const pad = 24;
  const viewBox = [
    bounds.x - pad,
    bounds.y - pad,
    Math.max(bounds.width + pad * 2, 160),
    Math.max(bounds.height + pad * 2, 100),
  ].join(" ");
  const body = elements
    .map((el) => {
      const common = `stroke="${escapeXml(el.color)}" stroke-width="${el.size}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
      switch (el.kind) {
        case "stroke": {
          if (el.points.length === 1) {
            const p = el.points[0];
            return `<circle cx="${p.x}" cy="${p.y}" r="${el.size / 2}" fill="${escapeXml(el.color)}" opacity="${el.opacity}"/>`;
          }
          const pts = el.points.map((p) => `${p.x},${p.y}`).join(" ");
          return `<polyline points="${pts}" ${common} opacity="${el.opacity}"/>`;
        }
        case "line":
          return `<line x1="${el.from.x}" y1="${el.from.y}" x2="${el.to.x}" y2="${el.to.y}" ${common}/>`;
        case "arrow": {
          const [l, r] = arrowHead(el.from, el.to, el.size);
          return `<path d="M${el.from.x} ${el.from.y}L${el.to.x} ${el.to.y}M${l.x} ${l.y}L${el.to.x} ${el.to.y}L${r.x} ${r.y}" ${common}/>`;
        }
        case "rect":
          return `<rect x="${Math.min(el.from.x, el.to.x)}" y="${Math.min(el.from.y, el.to.y)}" width="${Math.abs(el.to.x - el.from.x)}" height="${Math.abs(el.to.y - el.from.y)}" ${common}/>`;
        case "ellipse":
          return `<ellipse cx="${(el.from.x + el.to.x) / 2}" cy="${(el.from.y + el.to.y) / 2}" rx="${Math.abs(el.to.x - el.from.x) / 2}" ry="${Math.abs(el.to.y - el.from.y) / 2}" ${common}/>`;
        case "text":
          return `<text x="${el.at.x}" y="${el.at.y}" dominant-baseline="hanging" font-family="${FONT_FAMILY}" font-weight="600" font-size="${textFontSize(el.size)}" fill="${escapeXml(el.color)}">${escapeXml(el.text)}</text>`;
        case "fill":
          // Flood fills depend on rendered pixels; thumbnails skip them.
          return "";
      }
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"><rect x="-1e6" y="-1e6" width="2e6" height="2e6" fill="${CANVAS_BACKGROUND}"/>${body}</svg>`;
}
