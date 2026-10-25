"use client";

import Link from "next/link";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Eraser,
  Link2,
  Paintbrush,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CANVAS_BACKGROUND,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  Point,
  Segment,
  ServerMessage,
  clearCanvas,
  drawSegment,
  isValidSegment,
} from "@/lib/drawing";
import { SocketStatus, useRoomSocket } from "@/hooks/useRoomSocket";

const COLORS = [
  "#0f172a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
const SIZES = [4, 10, 24];
const MAX_QUEUED = 5000;

interface CanvasProps {
  roomId: string;
}

const Canvas: FC<CanvasProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevPoint = useRef<Point | null>(null);
  // Strokes drawn while offline; sent once the server hands us its history.
  const pending = useRef<Segment[]>([]);

  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [erasing, setErasing] = useState(false);
  const [peers, setPeers] = useState(1);
  const [copied, setCopied] = useState(false);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const handleMessage = useCallback((message: ServerMessage) => {
    const ctx = getCtx();
    if (!ctx) return;

    switch (message.type) {
      case "draw":
        if (isValidSegment(message.segment)) drawSegment(ctx, message.segment);
        break;
      case "clear":
        clearCanvas(ctx);
        break;
      case "history":
        clearCanvas(ctx);
        message.segments.filter(isValidSegment).forEach((s) => drawSegment(ctx, s));
        flushPending();
        break;
      case "info":
        // Older servers don't send history; flush on their greeting instead.
        flushPending();
        break;
      case "presence":
        setPeers(message.count);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { status, send } = useRoomSocket(roomId, handleMessage);

  function flushPending() {
    const ctx = getCtx();
    const queued = pending.current;
    pending.current = [];
    queued.forEach((segment) => {
      if (ctx) drawSegment(ctx, segment);
      if (!send({ type: "draw", segment })) pending.current.push(segment);
    });
  }

  useEffect(() => {
    const ctx = getCtx();
    if (ctx) clearCanvas(ctx);
  }, []);

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH * 10) / 10,
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT * 10) / 10,
    };
  };

  const emit = (from: Point, to: Point) => {
    const ctx = getCtx();
    if (!ctx) return;
    const segment: Segment = {
      from,
      to,
      color: erasing ? CANVAS_BACKGROUND : color,
      size: erasing ? size * 2.5 : size,
    };
    drawSegment(ctx, segment);
    if (!send({ type: "draw", segment }) && pending.current.length < MAX_QUEUED) {
      pending.current.push(segment);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toCanvasPoint(e);
    prevPoint.current = point;
    emit(point, point);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!prevPoint.current) return;
    const point = toCanvasPoint(e);
    emit(prevPoint.current, point);
    prevPoint.current = point;
  };

  const onPointerUp = () => {
    prevPoint.current = null;
  };

  const handleClear = () => {
    if (!window.confirm("Clear the canvas for everyone in this room?")) return;
    const ctx = getCtx();
    if (ctx) clearCanvas(ctx);
    pending.current = [];
    send({ type: "clear" });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `drawapp-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  };

  return (
    <div className="bg-dots flex flex-1 flex-col bg-slate-100">
      {/* Room bar */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-slate-900"
            aria-label="Leave room"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
            <span className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              Room
            </span>
            <span className="border-l border-slate-200 px-3 py-1.5 font-mono text-sm font-semibold tracking-[0.2em] text-slate-900">
              {roomId}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 border-l border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Link2 className="size-4" />
              )}
              <span className="hidden sm:inline">{copied ? "Copied" : "Invite"}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
            <Users className="size-4" />
            {peers}
          </span>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-1 items-start justify-center px-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "h-auto max-h-[calc(100vh-12.5rem)] w-auto max-w-full touch-none rounded-xl bg-white shadow-lg ring-1 ring-slate-200",
            erasing ? "cursor-cell" : "cursor-crosshair"
          )}
        />
      </div>

      {/* Toolbar */}
      <div className="sticky bottom-0 flex justify-center px-4 py-4">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
          <ToolButton
            label="Brush"
            active={!erasing}
            onClick={() => setErasing(false)}
          >
            <Paintbrush className="size-5" />
          </ToolButton>
          <ToolButton
            label="Eraser"
            active={erasing}
            onClick={() => setErasing(true)}
          >
            <Eraser className="size-5" />
          </ToolButton>

          <Divider />

          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Color ${c}`}
              onClick={() => {
                setColor(c);
                setErasing(false);
              }}
              className={cn(
                "size-7 shrink-0 rounded-full ring-offset-2 transition hover:scale-110",
                color === c && !erasing && "ring-2 ring-slate-900"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <label
            className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] transition hover:scale-110"
            title="Custom color"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setErasing(false);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>

          <Divider />

          {SIZES.map((s) => (
            <ToolButton
              key={s}
              label={`Brush size ${s}`}
              active={size === s}
              onClick={() => setSize(s)}
            >
              <span
                className="rounded-full bg-slate-800"
                style={{ width: 4 + s / 2, height: 4 + s / 2 }}
              />
            </ToolButton>
          ))}

          <Divider />

          <ToolButton label="Download PNG" onClick={handleDownload}>
            <Download className="size-5" />
          </ToolButton>
          <ToolButton label="Clear canvas" onClick={handleClear} danger>
            <Trash2 className="size-5" />
          </ToolButton>
        </div>
      </div>
    </div>
  );
};

function ToolButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition",
        active ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100",
        danger && "hover:bg-red-50 hover:text-red-600"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
}

function StatusBadge({ status }: { status: SocketStatus }) {
  const config = {
    open: { label: "Live", dot: "bg-green-500" },
    connecting: { label: "Connecting…", dot: "bg-amber-400 animate-pulse" },
    reconnecting: { label: "Reconnecting…", dot: "bg-amber-400 animate-pulse" },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm"
      title={
        status === "open"
          ? "Connected to the drawing server"
          : "The server may take up to a minute to wake up"
      }
    >
      <span className={cn("size-2 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export default Canvas;
