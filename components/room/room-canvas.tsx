"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Link2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CANVAS_BACKGROUND,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ClientMessage,
  DrawElement,
  Member,
  Point,
  RoomUser,
  ServerMessage,
  ShapeElement,
  StrokeElement,
  Tool,
  newId,
  renderScene,
  textFontSize,
} from "@/lib/drawing";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { PeopleMenu, StatusBadge } from "./people-menu";
import { COLORS, SIZES, TOOLS, Toolbar } from "./toolbar";
import { RemoteCursor, RemoteCursors } from "./remote-cursors";

const MAX_QUEUED = 5000;
const CURSOR_INTERVAL_MS = 40;
const STROKE_TOOLS: Tool[] = ["pen", "highlighter", "eraser"];

type Drag =
  | { kind: "stroke"; id: string; buffer: Point[] }
  | { kind: "shape"; from: Point };

type Box = { left: number; top: number; width: number; height: number };
type TextDraft = { at: Point; value: string };

// Shift snaps lines to 45° and makes rectangles/ellipses square.
function constrain(from: Point, to: Point, kind: ShapeElement["kind"]): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (kind === "rect" || kind === "ellipse") {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: from.x + Math.sign(dx || 1) * side, y: from.y + Math.sign(dy || 1) * side };
  }
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  const length = Math.hypot(dx, dy);
  return { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length };
}

export default function RoomCanvas({ roomId, user }: { roomId: string; user: RoomUser }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, DrawElement>());
  const preview = useRef<ShapeElement | null>(null);
  const drag = useRef<Drag | null>(null);
  // Messages produced while offline; replayed once the server sends its state.
  const pending = useRef<ClientMessage[]>([]);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<DrawElement[]>([]);
  const frame = useRef<number>();
  const lastCursorAt = useRef(0);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [peers, setPeers] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [textDraft, setTextDraftState] = useState<TextDraft | null>(null);
  // Mirrors textDraft so Enter + blur can't commit the same text twice.
  const textDraftRef = useRef<TextDraft | null>(null);
  const setTextDraft = (draft: TextDraft | null) => {
    textDraftRef.current = draft;
    setTextDraftState(draft);
  };
  const [box, setBox] = useState<Box | null>(null);
  const [copied, setCopied] = useState(false);

  const render = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) renderScene(ctx, elements.current.values(), preview.current);
    });
  }, []);

  const syncHistory = () =>
    setHistory({ undo: undoStack.current.length, redo: redoStack.current.length });

  // Applies a change to the local scene; shared by local edits, server events and replays.
  function apply(message: ClientMessage | ServerMessage) {
    const map = elements.current;
    switch (message.type) {
      case "add":
        map.delete(message.element.id);
        map.set(message.element.id, message.element);
        break;
      case "append": {
        const el = map.get(message.id);
        if (el?.kind === "stroke") el.points.push(...message.points);
        break;
      }
      case "remove":
        map.delete(message.id);
        break;
      case "clear":
        map.clear();
        break;
    }
  }

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "init":
        elements.current = new Map(message.elements.map((el) => [el.id, el]));
        flushPending();
        break;
      case "add":
      case "append":
      case "remove":
        apply(message);
        break;
      case "clear":
        apply(message);
        undoStack.current = [];
        redoStack.current = [];
        syncHistory();
        break;
      case "presence":
        setPeers(message.count);
        if (Array.isArray(message.users)) {
          const users = message.users;
          setMembers(users);
          setCursors((current) =>
            Object.fromEntries(
              Object.entries(current).filter(([id]) =>
                users.some((u) => u.connectionId === id)
              )
            )
          );
        }
        return;
      case "cursor":
        setCursors((current) => ({
          ...current,
          [message.connectionId]: { x: message.x, y: message.y, seen: Date.now() },
        }));
        return;
    }
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { status, send } = useRoomSocket(roomId, user, handleMessage);

  function emit(message: ClientMessage) {
    if (send(message)) return;
    // Snapshot it: strokes keep growing locally and would otherwise be replayed twice.
    if (pending.current.length < MAX_QUEUED) pending.current.push(structuredClone(message));
  }

  function flushPending() {
    const queued = pending.current;
    pending.current = [];
    queued.forEach((message) => {
      apply(structuredClone(message));
      emit(message);
    });
  }

  function commit(element: DrawElement) {
    apply({ type: "add", element });
    emit({ type: "add", element });
    undoStack.current.push(element.id);
    redoStack.current = [];
    syncHistory();
  }

  function undo() {
    if (drag.current) return;
    while (undoStack.current.length) {
      const id = undoStack.current.pop()!;
      const el = elements.current.get(id);
      if (!el) continue; // already gone (e.g. someone cleared the board)
      redoStack.current.push(structuredClone(el));
      apply({ type: "remove", id });
      emit({ type: "remove", id });
      break;
    }
    syncHistory();
    render();
  }

  function redo() {
    const el = redoStack.current.pop();
    if (!el || drag.current) return;
    apply({ type: "add", element: el });
    emit({ type: "add", element: el });
    undoStack.current.push(el.id);
    syncHistory();
    render();
  }

  // Keep the cursor/text overlays aligned with wherever the canvas ends up on screen.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    const measure = () =>
      setBox({
        left: canvas.offsetLeft,
        top: canvas.offsetTop,
        width: canvas.offsetWidth,
        height: canvas.offsetHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    render();
    const prune = setInterval(() => {
      const cutoff = Date.now() - 8000;
      setCursors((current) => {
        const fresh = Object.entries(current).filter(([, c]) => c.seen > cutoff);
        return fresh.length === Object.keys(current).length
          ? current
          : Object.fromEntries(fresh);
      });
    }, 2000);
    return () => clearInterval(prune);
  }, [render]);

  // Keyboard shortcuts: tools by letter, Ctrl/Cmd+Z to undo, +Shift (or Ctrl+Y) to redo.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        redo();
      } else if (!mod && !e.altKey) {
        const match = TOOLS.find((t) => t.key === key);
        if (match) setTool(match.tool);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH * 10) / 10,
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT * 10) / 10,
    };
  };

  const sendCursor = (point: Point) => {
    const now = Date.now();
    if (now - lastCursorAt.current < CURSOR_INTERVAL_MS) return;
    lastCursorAt.current = now;
    send({ type: "cursor", ...point });
  };

  const flushStroke = () => {
    const d = drag.current;
    if (d?.kind !== "stroke" || d.buffer.length === 0) return;
    emit({ type: "append", id: d.id, points: d.buffer });
    d.buffer = [];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const point = toCanvasPoint(e);

    if (tool === "text") {
      e.preventDefault();
      if (textDraftRef.current) commitText();
      setTextDraft({ at: point, value: "" });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    if (STROKE_TOOLS.includes(tool)) {
      const stroke: StrokeElement = {
        id: newId(),
        kind: "stroke",
        points: [point],
        color: tool === "eraser" ? CANVAS_BACKGROUND : color,
        size: tool === "pen" ? size : size * 2.5,
        opacity: tool === "highlighter" ? 0.35 : 1,
      };
      commit(stroke);
      drag.current = { kind: "stroke", id: stroke.id, buffer: [] };
    } else {
      drag.current = { kind: "shape", from: point };
      preview.current = {
        id: newId(),
        kind: tool as ShapeElement["kind"],
        from: point,
        to: point,
        color,
        size,
      };
    }
    render();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toCanvasPoint(e);
    sendCursor(point);
    const d = drag.current;
    if (!d) return;

    if (d.kind === "stroke") {
      const el = elements.current.get(d.id);
      if (el?.kind !== "stroke") return;
      const last = el.points[el.points.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5) return;
      el.points.push(point);
      d.buffer.push(point);
      if (d.buffer.length >= 4) flushStroke();
    } else if (preview.current) {
      preview.current = {
        ...preview.current,
        to: e.shiftKey ? constrain(d.from, point, preview.current.kind) : point,
      };
    }
    render();
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "stroke") {
      flushStroke();
    } else {
      const shape = preview.current;
      preview.current = null;
      if (shape && Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y) > 3) {
        commit(shape);
      }
    }
    drag.current = null;
    render();
  };

  function commitText() {
    const draft = textDraftRef.current;
    setTextDraft(null);
    if (!draft?.value.trim()) return;
    commit({ id: newId(), kind: "text", at: draft.at, text: draft.value.trim(), color, size });
    render();
  }

  const handleClear = () => {
    if (!window.confirm("Clear the canvas for everyone in this room?")) return;
    apply({ type: "clear" });
    emit({ type: "clear" });
    undoStack.current = [];
    redoStack.current = [];
    syncHistory();
    render();
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

  const scale = box ? box.width / CANVAS_WIDTH : 1;

  return (
    <div className="bg-dots flex flex-1 flex-col bg-muted/40">
      {/* Room bar */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center rounded-lg border bg-card shadow-sm">
          <span className="hidden px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:inline">
            Room
          </span>
          <span className="px-3 py-1.5 font-mono text-sm font-semibold tracking-[0.15em] sm:border-l sm:tracking-[0.2em]">
            {roomId}
          </span>
          <button
            onClick={handleCopyLink}
            title="Copy invite link"
            className="flex items-center gap-1.5 border-l px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            {copied ? <Check className="size-4 text-green-600" /> : <Link2 className="size-4" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Invite"}</span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <PeopleMenu members={members} fallbackCount={peers} me={user} />
          <StatusBadge status={status} />
          <button
            onClick={() => router.push("/")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-card px-2.5 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 sm:px-3 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Board */}
      <div ref={boardRef} className="relative flex items-start justify-center px-3 sm:flex-1 sm:px-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => send({ type: "cursor", x: -1, y: -1 })}
          className={cn(
            "h-auto max-h-[calc(100dvh-13.5rem)] w-auto max-w-full touch-none rounded-xl bg-white shadow-lg ring-1 ring-border dark:shadow-black/40",
            tool === "text" ? "cursor-text" : tool === "eraser" ? "cursor-cell" : "cursor-crosshair"
          )}
        />
        {box && (
          <div className="pointer-events-none absolute" style={box}>
            <RemoteCursors cursors={cursors} members={members} />
            {textDraft && (
              <input
                autoFocus
                value={textDraft.value}
                onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitText();
                  if (e.key === "Escape") setTextDraft(null);
                }}
                onBlur={commitText}
                placeholder="Type…"
                maxLength={500}
                className="pointer-events-auto absolute min-w-[8ch] rounded border border-dashed border-indigo-400 bg-transparent px-0.5 font-semibold leading-none outline-none placeholder:text-slate-400"
                style={{
                  left: textDraft.at.x * scale,
                  top: textDraft.at.y * scale,
                  fontSize: textFontSize(size) * scale,
                  color,
                  width: `${Math.max(textDraft.value.length + 2, 8)}ch`,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex justify-center px-3 py-3 sm:sticky sm:bottom-0 sm:px-4 sm:py-4">
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          canUndo={history.undo > 0}
          canRedo={history.redo > 0}
          onUndo={undo}
          onRedo={redo}
          onDownload={handleDownload}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
