// Every client draws in the same logical space, so strokes line up no matter
// how large the canvas is on screen.
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 1000;
export const CANVAS_BACKGROUND = "#ffffff";

export type Point = { x: number; y: number };

export type Tool =
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
  | { type: "cursor"; connectionId: string; x: number; y: number };

export type ClientMessage =
  | { type: "join"; user: RoomUser }
  | { type: "add"; element: DrawElement }
  | { type: "append"; id: string; points: Point[] }
  | { type: "remove"; id: string }
  | { type: "clear" }
  | { type: "cursor"; x: number; y: number };

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

export function drawElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
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
    case "fill": {
      floodFill(ctx, el.at, el.color);
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

// Scanline flood fill over the pixels rendered so far.
function floodFill(ctx: CanvasRenderingContext2D, at: Point, color: string) {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const x0 = Math.floor(at.x);
  const y0 = Math.floor(at.y);
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return;

  const image = ctx.getImageData(0, 0, W, H);
  const data = image.data;
  const start = (y0 * W + x0) * 4;
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const fill = parseColor(ctx, color);
  if (target.every((v, i) => Math.abs(v - fill[i]) < 3)) return;

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
    for (let cx = left; cx <= right; cx++) {
      const p = y * W + cx;
      done[p] = 1;
      data.set(fill, p * 4);
    }
    // Seed the rows above and below once per contiguous run.
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue;
      let inRun = false;
      for (let cx = left; cx <= right; cx++) {
        const ok = matches(cx, ny);
        if (ok && !inRun) stack.push(cx, ny);
        inRun = ok;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

// Flood fills read pixels, so they're slow; keep a snapshot of everything up to the
// last fill and only redraw what came after it.
const fillCache = new WeakMap<
  CanvasRenderingContext2D,
  { key: string; snapshot: HTMLCanvasElement }
>();

export function renderScene(
  ctx: CanvasRenderingContext2D,
  elements: Iterable<DrawElement>,
  preview?: DrawElement | null
) {
  const list = Array.from(elements);
  let lastFill = -1;
  list.forEach((el, i) => {
    if (el.kind === "fill") lastFill = i;
  });

  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (lastFill >= 0) {
    let points = 0;
    for (let i = 0; i <= lastFill; i++) {
      const el = list[i];
      if (el.kind === "stroke") points += el.points.length;
    }
    const key = `${lastFill}:${list[0].id}:${list[lastFill].id}:${points}`;
    const cached = fillCache.get(ctx);
    if (cached?.key === key) {
      ctx.drawImage(cached.snapshot, 0, 0);
    } else {
      for (let i = 0; i <= lastFill; i++) drawElement(ctx, list[i]);
      const snapshot = cached?.snapshot ?? document.createElement("canvas");
      snapshot.width = CANVAS_WIDTH;
      snapshot.height = CANVAS_HEIGHT;
      snapshot.getContext("2d")?.drawImage(ctx.canvas, 0, 0);
      fillCache.set(ctx, { key, snapshot });
    }
  }

  for (let i = lastFill + 1; i < list.length; i++) drawElement(ctx, list[i]);
  if (preview) drawElement(ctx, preview);
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Static SVG version of a drawing, used for room thumbnails on the server.
export function elementsToSvg(elements: DrawElement[]) {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}"><rect width="100%" height="100%" fill="${CANVAS_BACKGROUND}"/>${body}</svg>`;
}
