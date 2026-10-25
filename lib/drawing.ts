// Every client draws in the same logical space, so strokes line up no matter
// how large the canvas is on screen.
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 1000;
export const CANVAS_BACKGROUND = "#ffffff";

export type Point = { x: number; y: number };

export type Segment = {
  from: Point;
  to: Point;
  color: string;
  size: number;
};

export type RoomUser = { id: string; name: string; image: string | null };

export type Member = {
  connectionId: string;
  userId: string | null;
  name: string;
  image: string | null;
};

export type ServerMessage =
  | { type: "draw"; segment: Segment }
  | { type: "clear" }
  | { type: "history"; segments: Segment[] }
  | { type: "presence"; count: number; users?: Member[] }
  | { type: "info"; message: string };

export type ClientMessage =
  | { type: "draw"; segment: Segment }
  | { type: "clear" }
  | { type: "join"; user: RoomUser };

export function drawSegment(ctx: CanvasRenderingContext2D, segment: Segment) {
  ctx.strokeStyle = segment.color;
  ctx.lineWidth = segment.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(segment.from.x, segment.from.y);
  ctx.lineTo(segment.to.x, segment.to.y);
  ctx.stroke();
}

export function clearCanvas(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function isValidSegment(value: unknown): value is Segment {
  const s = value as Segment;
  return (
    !!s &&
    typeof s.color === "string" &&
    typeof s.size === "number" &&
    [s.from?.x, s.from?.y, s.to?.x, s.to?.y].every(Number.isFinite)
  );
}
