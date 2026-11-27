"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Link2, LogOut, Trash2, Users } from "lucide-react";
import paintBrush from "@/app/fonts/paintbrush.png";
import { cn } from "@/lib/utils";
import {
  CANVAS_BACKGROUND,
  ClientMessage,
  DrawElement,
  FillElement,
  GridMode,
  Member,
  Point,
  RoomUser,
  ServerMessage,
  ShapeElement,
  StrokeElement,
  TextFont,
  Tool,
  View,
  clampZoom,
  exportCanvas,
  fillWouldApply,
  invalidateRaster,
  newId,
  renderScene,
  sceneBounds,
  textAt,
  textFontSize,
  textSize,
  toScreen,
  toWorld,
  zoomAt,
} from "@/lib/drawing";
import { api } from "@/lib/api";
import { loadTextFonts, textFont } from "@/lib/fonts";
import { useRoomSocket } from "@/hooks/useRoomSocket";
import { useAuth } from "@/components/auth/auth-provider";
import { LoginPrompt } from "@/components/auth/login-prompt";
import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { RoomsDialog } from "./rooms-dialog";
import { ConfirmDialog } from "@/components/ui/glass-dialog";
import UserMenu from "@/components/user-menu";
import { PeopleMenu, StatusBadge } from "./people-menu";
import { COLORS, GRID_NEXT, PANEL, SIZES, StyleBar, TOOLS, ToolRail, ZoomControls } from "./toolbar";
import { RemoteCursor, RemoteCursors } from "./remote-cursors";
import { PrivacyButton } from "./privacy-dialog";

const MAX_QUEUED = 5000;
const CURSOR_INTERVAL_MS = 40;
const STROKE_TOOLS: Tool[] = ["pen", "highlighter", "eraser"];
const DEFAULT_VIEW: View = { x: 0, y: 0, zoom: 1 };
// The solo board lives in this browser only.
const LOCAL_KEY = "drawapp:board";
// A solo drawing handed to a freshly created room, read once on its first load.
const SEED_PREFIX = "drawapp:seed:";
// Grid style is a per-viewer preference, shared by the solo board and rooms.
const GRID_KEY = "drawapp:grid";

export type RoomConfig = {
  roomId: string;
  user: RoomUser;
  token: string | null;
  isOwner: boolean;
  isPrivate: boolean;
  onAccessLost: () => void;
};

type Drag =
  | { kind: "stroke"; id: string; buffer: Point[] }
  | { kind: "shape"; from: Point };

// Camera gestures; while one is active nothing gets drawn.
type Gesture =
  | { kind: "pan"; pointerId: number; start: Point; view: View }
  | { kind: "pinch"; dist: number; mid: Point; view: View }
  // A pinch ended: ignore the remaining finger until it lifts too.
  | { kind: "ended" };

// Text being typed. fontSize is in world units; id is set when re-editing placed text.
type TextDraft = {
  at: Point;
  value: string;
  fontSize: number;
  font: TextFont;
  color: string;
  id?: string;
};

// On-screen font size limits for the text resize handle.
const MIN_TEXT_PX = 8;
const MAX_TEXT_PX = 400;

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

const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Centres the drawing on screen, never zooming in past 100%.
function fitView(elements: Iterable<DrawElement>, width: number, height: number): View {
  const bounds = sceneBounds(elements);
  if (!bounds || !width || !height) return DEFAULT_VIEW;
  const pad = Math.min(96, width * 0.15);
  const zoom = clampZoom(
    Math.min(
      1,
      (width - pad * 2) / Math.max(bounds.width, 1),
      (height - pad * 2) / Math.max(bounds.height, 1)
    )
  );
  return {
    zoom,
    x: bounds.x + bounds.width / 2 - width / 2 / zoom,
    y: bounds.y + bounds.height / 2 - height / 2 / zoom,
  };
}

// The one popup that can be open over the board at a time.
type Dialog =
  | { kind: "rooms" }
  | { kind: "clear" }
  | { kind: "login"; title: string; message: string; next: string }
  | { kind: "auth"; mode: AuthMode; next: string; error?: string };

export type InitialAuth = { mode: AuthMode; next?: string; error?: string };

export default function Whiteboard({
  room,
  initialAuth,
}: {
  room?: RoomConfig;
  // Opens the sign-in / register popup on load (the /signin and /register routes).
  initialAuth?: InitialAuth;
}) {
  const router = useRouter();
  const { user: account, loading: authLoading } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elements = useRef(new Map<string, DrawElement>());
  const preview = useRef<ShapeElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Point>());
  // Messages produced while offline; replayed once the server sends its state.
  const pending = useRef<ClientMessage[]>([]);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<DrawElement[]>([]);
  const frame = useRef<number>();
  const lastCursorAt = useRef(0);
  const pixelRatio = useRef(1);
  const fitted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const viewRef = useRef<View>(DEFAULT_VIEW);
  const [view, setViewState] = useState<View>(DEFAULT_VIEW);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [font, setFont] = useState<TextFont>("sans");
  const [grid, setGridState] = useState<GridMode>("lines");
  const gridRef = useRef<GridMode>("lines");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [peers, setPeers] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [history, setHistory] = useState({ undo: 0, redo: 0 });
  const [textDraft, setTextDraftState] = useState<TextDraft | null>(null);
  // Mirrors textDraft so Enter + blur can't commit the same text twice.
  const textDraftRef = useRef<TextDraft | null>(null);
  // Placed text being re-edited is hidden from the canvas while the box shows it.
  const editingId = useRef<string | null>(null);
  const textResize = useRef<{ x: number; y: number; px: number } | null>(null);
  const setTextDraft = (draft: TextDraft | null) => {
    textDraftRef.current = draft;
    setTextDraftState(draft);
  };
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string>();
  const hintTimer = useRef<ReturnType<typeof setTimeout>>();
  const [dialog, setDialog] = useState<Dialog | null>(
    initialAuth
      ? { kind: "auth", mode: initialAuth.mode, next: initialAuth.next ?? "/", error: initialAuth.error }
      : null
  );

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      renderScene(
        ctx,
        editingId.current
          ? Array.from(elements.current.values()).filter((el) => el.id !== editingId.current)
          : elements.current.values(),
        preview.current,
        viewRef.current,
        pixelRatio.current,
        gridRef.current
      );
    }
  }, []);

  const render = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      draw();
    });
  }, [draw]);

  const writeLocal = useCallback(() => {
    if (room) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    try {
      localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({ elements: Array.from(elements.current.values()), view: viewRef.current })
      );
    } catch {
      // Storage full or blocked: the board still works, it just won't survive a reload.
    }
  }, [room]);

  const persistLocal = useCallback(() => {
    if (room) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(writeLocal, 400);
  }, [room, writeLocal]);

  const setView = useCallback(
    (next: View) => {
      viewRef.current = next;
      setViewState(next);
      render();
      persistLocal();
    },
    [persistLocal, render]
  );

  const setGrid = (mode: GridMode) => {
    gridRef.current = mode;
    setGridState(mode);
    render();
    try {
      localStorage.setItem(GRID_KEY, mode);
    } catch {
      // Not remembered; harmless.
    }
  };

  // Restore the grid preference, and redraw once the text fonts have downloaded.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GRID_KEY);
      if (saved === "lines" || saved === "dots" || saved === "off") {
        gridRef.current = saved;
        setGridState(saved);
      }
    } catch {
      // Storage blocked: keep the default.
    }
    let cancelled = false;
    void loadTextFonts().then(() => {
      if (cancelled) return;
      invalidateRaster();
      render();
    });
    return () => {
      cancelled = true;
    };
  }, [render]);

  const showHint = (message: string) => {
    setHint(message);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(undefined), 2500);
  };

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

  const screenSize = () => ({
    width: canvasRef.current?.clientWidth ?? 0,
    height: canvasRef.current?.clientHeight ?? 0,
  });

  // Copies a solo drawing into a room that was just created from it.
  function seedRoom(roomIsEmpty: boolean) {
    if (!room) return;
    const key = SEED_PREFIX + room.roomId;
    let seed: string | null = null;
    try {
      seed = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
    } catch {
      return;
    }
    if (!seed || !roomIsEmpty) return;
    try {
      (JSON.parse(seed) as DrawElement[]).forEach((element) => {
        apply({ type: "add", element });
        emit({ type: "add", element });
      });
    } catch {
      // A malformed seed just means the room starts empty.
    }
  }

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "init":
        elements.current = new Map(message.elements.map((el) => [el.id, el]));
        flushPending();
        seedRoom(message.elements.length === 0);
        // Show the drawing on first load; reconnects keep the current view.
        if (!fitted.current) {
          fitted.current = true;
          const { width, height } = screenSize();
          setView(fitView(elements.current.values(), width, height));
        }
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
      case "cursor-leave":
        setCursors((current) => {
          if (!(message.connectionId in current)) return current;
          const next = { ...current };
          delete next[message.connectionId];
          return next;
        });
        return;
    }
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Access changed (password set or changed): ask the API again for what we may see.
  const { status, send } = useRoomSocket(
    room?.roomId ?? null,
    room?.token ?? null,
    room?.user ?? null,
    handleMessage,
    room?.onAccessLost ?? (() => {})
  );

  function emit(message: ClientMessage) {
    if (!room) {
      persistLocal();
      return;
    }
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

  // The canvas always covers the screen; its backing store follows size and pixel density.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      pixelRatio.current = ratio;
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  // The solo board restores from this browser.
  useEffect(() => {
    if (room) return;
    try {
      const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null");
      if (Array.isArray(saved?.elements)) {
        elements.current = new Map(
          (saved.elements as DrawElement[]).map((el) => [el.id, el])
        );
      }
      const v = saved?.view;
      if (v && [v.x, v.y, v.zoom].every(Number.isFinite)) {
        setView({ x: v.x, y: v.y, zoom: clampZoom(v.zoom) });
      }
    } catch {
      // Nothing saved, or storage is blocked.
    }
    render();
    window.addEventListener("pagehide", writeLocal);
    return () => {
      window.removeEventListener("pagehide", writeLocal);
      if (saveTimer.current) writeLocal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const zoomBy = (factor: number) => {
    const { width, height } = screenSize();
    const v = viewRef.current;
    setView(zoomAt(v, { x: width / 2, y: height / 2 }, v.zoom * factor));
  };

  const fitToContent = () => {
    const { width, height } = screenSize();
    setView(fitView(elements.current.values(), width, height));
  };

  // Wheel / trackpad: scroll pans, pinch (reported as ctrl+wheel) or ctrl+scroll zooms.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setView(zoomAt(v, anchor, v.zoom * Math.exp(-dy * 0.01)));
      } else if (e.shiftKey && dx === 0) {
        setView({ ...v, x: v.x + dy / v.zoom });
      } else {
        setView({ ...v, x: v.x + dx / v.zoom, y: v.y + dy / v.zoom });
      }
    };
    // Stop Safari from zooming the whole page on a trackpad pinch.
    const stopGesture = (e: Event) => e.preventDefault();
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("gesturestart", stopGesture);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("gesturestart", stopGesture);
    };
  }, [setView]);

  // Keyboard: tools by letter, Space to pan, Ctrl/Cmd+Z undo (+Shift or Ctrl+Y redo),
  // Ctrl/Cmd +/- to zoom and Ctrl/Cmd+0 to bring the drawing back into view.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (e.code === "Space" && !mod) {
        e.preventDefault();
        setSpaceHeld(true);
      } else if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        redo();
      } else if (mod && (key === "=" || key === "+")) {
        e.preventDefault();
        zoomBy(1.2);
      } else if (mod && key === "-") {
        e.preventDefault();
        zoomBy(1 / 1.2);
      } else if (mod && key === "0") {
        e.preventDefault();
        fitToContent();
      } else if (!mod && !e.altKey && key === "g") {
        setGrid(GRID_NEXT[gridRef.current]);
      } else if (!mod && !e.altKey) {
        const match = TOOLS.find((t) => t.key === key);
        if (match) setTool(match.tool);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    const onBlur = () => setSpaceHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  });

  const screenPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const worldPoint = (screen: Point): Point => {
    const p = toWorld(viewRef.current, screen);
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  };

  const sendCursor = (point: Point) => {
    if (!room) return;
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

  // A second finger landed: the first touch was the start of a pinch, not a drawing.
  const cancelDrag = () => {
    const d = drag.current;
    drag.current = null;
    preview.current = null;
    if (d?.kind !== "stroke") return;
    apply({ type: "remove", id: d.id });
    emit({ type: "remove", id: d.id });
    undoStack.current = undoStack.current.filter((id) => id !== d.id);
    syncHistory();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const screen = screenPoint(e);
    pointers.current.set(e.pointerId, screen);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.pointerType === "touch" && pointers.current.size === 2) {
      cancelDrag();
      const [a, b] = Array.from(pointers.current.values());
      gesture.current = {
        kind: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: midpoint(a, b),
        view: viewRef.current,
      };
      render();
      return;
    }
    if (gesture.current || drag.current) return;

    if (e.button === 1 || (e.button === 0 && (tool === "hand" || spaceHeld))) {
      e.preventDefault();
      gesture.current = { kind: "pan", pointerId: e.pointerId, start: screen, view: viewRef.current };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    const point = worldPoint(screen);

    if (tool === "fill") {
      const fill: FillElement = { id: newId(), kind: "fill", at: point, color, size: 1 };
      if (fillWouldApply(elements.current.values(), fill)) {
        commit(fill);
        render();
      } else {
        showHint("Fill works inside closed shapes");
      }
      return;
    }

    if (tool === "text") {
      e.preventDefault();
      if (textDraftRef.current) commitText();
      const hit = textAt(elements.current.values(), point);
      if (hit) {
        // Clicking placed text reopens it for editing and resizing.
        editingId.current = hit.id;
        setTextDraft({
          at: hit.at,
          value: hit.text,
          fontSize: textSize(hit),
          font: hit.font ?? "sans",
          color: hit.color,
          id: hit.id,
        });
        render();
        return;
      }
      // Size the text for the screen, not the world, so it reads the same at any zoom.
      setTextDraft({
        at: point,
        value: "",
        fontSize: textFontSize(size) / viewRef.current.zoom,
        font,
        color,
      });
      return;
    }

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
    const screen = screenPoint(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, screen);
    const g = gesture.current;

    if (g?.kind === "pinch") {
      const [a, b] = Array.from(pointers.current.values());
      if (!a || !b) return;
      const zoom = clampZoom((g.view.zoom * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / g.dist);
      // Keep the world point that started under the fingers under them, so pinch also pans.
      const anchor = toWorld(g.view, g.mid);
      const mid = midpoint(a, b);
      setView({ zoom, x: anchor.x - mid.x / zoom, y: anchor.y - mid.y / zoom });
      return;
    }
    if (g?.kind === "pan") {
      if (e.pointerId !== g.pointerId) return;
      setView({
        ...g.view,
        x: g.view.x - (screen.x - g.start.x) / g.view.zoom,
        y: g.view.y - (screen.y - g.start.y) / g.view.zoom,
      });
      return;
    }
    if (g) return;

    const point = worldPoint(screen);
    sendCursor(point);
    const d = drag.current;
    if (!d) return;

    if (d.kind === "stroke") {
      const el = elements.current.get(d.id);
      if (el?.kind !== "stroke") return;
      const last = el.points[el.points.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5 / viewRef.current.zoom) return;
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

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g) {
      if (g.kind === "pan") {
        if (e.pointerId !== g.pointerId) return;
        gesture.current = null;
        setPanning(false);
      } else {
        gesture.current = pointers.current.size === 0 ? null : { kind: "ended" };
      }
      return;
    }

    const d = drag.current;
    if (!d) return;
    if (d.kind === "stroke") {
      flushStroke();
    } else {
      const shape = preview.current;
      preview.current = null;
      const minLength = 3 / viewRef.current.zoom;
      if (shape && Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y) > minLength) {
        commit(shape);
      }
    }
    drag.current = null;
    render();
  };

  function commitText() {
    const draft = textDraftRef.current;
    setTextDraft(null);
    editingId.current = null;
    if (!draft) return;
    const text = draft.value.trim();
    if (!text) {
      // Emptying re-edited text deletes it.
      if (draft.id) {
        apply({ type: "remove", id: draft.id });
        emit({ type: "remove", id: draft.id });
      }
      render();
      return;
    }
    commit({
      id: draft.id ?? newId(),
      kind: "text",
      at: draft.at,
      text,
      color: draft.color,
      size,
      fontSize: Math.round(draft.fontSize * 10) / 10,
      ...(draft.font !== "sans" ? { font: draft.font } : {}),
    });
    render();
  }

  const cancelText = () => {
    setTextDraft(null);
    editingId.current = null;
    render();
  };

  // Corner handle: drag to scale the text. preventDefault keeps the input focused.
  const onResizeStart = (e: React.PointerEvent<HTMLSpanElement>) => {
    const draft = textDraftRef.current;
    if (!draft) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    textResize.current = { x: e.clientX, y: e.clientY, px: draft.fontSize * viewRef.current.zoom };
  };

  const onResizeMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const start = textResize.current;
    const draft = textDraftRef.current;
    if (!start || !draft) return;
    const delta = (e.clientX - start.x + (e.clientY - start.y)) / 2;
    const px = Math.min(MAX_TEXT_PX, Math.max(MIN_TEXT_PX, start.px + delta));
    setTextDraft({ ...draft, fontSize: px / viewRef.current.zoom });
  };

  const onResizeEnd = () => {
    textResize.current = null;
  };

  const handleClear = () => {
    if (elements.current.size === 0) {
      showHint("The board is already empty");
      return;
    }
    setDialog({ kind: "clear" });
  };

  const clearBoard = () => {
    apply({ type: "clear" });
    emit({ type: "clear" });
    undoStack.current = [];
    redoStack.current = [];
    syncHistory();
    render();
  };

  const handleDownload = () => {
    const canvas = exportCanvas(elements.current.values());
    if (!canvas) {
      showHint("Nothing to download yet");
      return;
    }
    const link = document.createElement("a");
    link.download = `drawapp-${room?.roomId ?? "board"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showHint("Couldn't copy — share the link from the address bar");
    }
  };

  const closeDialog = () => {
    // /signin and /register are just the board with this popup open.
    if (dialog?.kind === "auth" && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
    setDialog(null);
  };

  // Solo board → live room: needs an account; the drawing comes along.
  const createLiveRoom = async (password?: string) => {
    if (!account) {
      setDialog({
        kind: "login",
        title: "Sign in to draw together",
        message: "Live rooms need an account. Your board stays saved here, and it comes with you into the new room.",
        next: "/",
      });
      return;
    }
    const { roomId } = await api.createRoom(password);
    if (elements.current.size > 0) {
      try {
        sessionStorage.setItem(SEED_PREFIX + roomId, JSON.stringify(Array.from(elements.current.values())));
      } catch {
        // Too large to hand over; the room starts empty instead.
      }
    }
    router.push(`/rooms/${roomId}`);
  };

  const joinRoom = (roomId: string) => {
    const path = `/rooms/${roomId}`;
    if (!account) {
      setDialog({
        kind: "login",
        title: `Sign in to join ${roomId}`,
        message: "You'll be taken straight into the room once you're signed in.",
        next: path,
      });
      return;
    }
    router.push(path);
  };

  const draftAt = textDraft ? toScreen(view, textDraft.at) : null;
  const panReady = tool === "hand" || spaceHeld;

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none" style={{ background: CANVAS_BACKGROUND }}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => room && send({ type: "cursor-leave" })}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "absolute inset-0 h-full w-full touch-none select-none",
          panning
            ? "cursor-grabbing"
            : panReady
              ? "cursor-grab"
              : tool === "text"
                ? "cursor-text"
                : tool === "eraser"
                  ? "cursor-cell"
                  : tool === "fill"
                    ? "cursor-copy"
                    : "cursor-crosshair"
        )}
      />

      {/* World-anchored overlays */}
      <div className="pointer-events-none absolute inset-0">
        {room && <RemoteCursors cursors={cursors} members={members} view={view} />}
        {textDraft && draftAt && (
          <div className="pointer-events-auto absolute" style={{ left: draftAt.x, top: draftAt.y }}>
            <input
              autoFocus
              value={textDraft.value}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") cancelText();
              }}
              onBlur={() => {
                if (!textResize.current) commitText();
              }}
              placeholder="Type…"
              maxLength={500}
              className="block min-w-[4ch] rounded border border-dashed border-indigo-400 bg-transparent px-0.5 leading-none outline-none placeholder:text-slate-400"
              style={{
                fontSize: textDraft.fontSize * view.zoom,
                fontFamily: textFont(textDraft.font).family,
                fontWeight: textFont(textDraft.font).weight,
                color: textDraft.color,
                width: `${Math.max(textDraft.value.length + 2, 6)}ch`,
              }}
            />
            <span
              role="presentation"
              title="Drag to resize"
              onPointerDown={onResizeStart}
              onPointerMove={onResizeMove}
              onPointerUp={onResizeEnd}
              onPointerCancel={onResizeEnd}
              className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize touch-none rounded-full border-2 border-indigo-500 bg-white shadow"
            />
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className={cn(PANEL, "flex min-w-0 items-center rounded-xl")}>
          <Link
            href="/"
            title="DrawApp"
            className="flex shrink-0 items-center gap-2 px-2.5 py-1.5 font-semibold transition hover:opacity-80"
          >
            <Image src={paintBrush} alt="" width={24} height={24} />
            <span className={cn("font-display text-2xl font-bold leading-none", room && "hidden lg:inline")}>DrawApp</span>
          </Link>
          {room ? (
            <>
              <span className="border-l px-3 py-1.5 font-mono text-sm font-semibold tracking-[0.15em] sm:tracking-[0.2em]">
                {room.roomId}
              </span>
              <button
                onClick={handleCopyLink}
                title="Copy invite link"
                className="flex items-center gap-1.5 rounded-r-xl border-l px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
              >
                {copied ? <Check className="size-4 text-green-600" /> : <Link2 className="size-4" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Invite"}</span>
              </button>
            </>
          ) : (
            <span
              className="hidden border-l px-3 py-1.5 text-xs text-muted-foreground sm:inline"
              title="Your solo board is saved in this browser"
            >
              Saved in this browser
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {room ? (
            <>
              <PrivacyButton roomId={room.roomId} isOwner={room.isOwner} isPrivate={room.isPrivate} />
              <PeopleMenu members={members} fallbackCount={peers} me={room.user} />
              <StatusBadge status={status} />
              <button
                onClick={() => router.push("/")}
                className="glass inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50/80 sm:px-3 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDialog({ kind: "rooms" })}
                title="Start or join a live room"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90"
              >
                <Users className="size-4" />
                <span className="hidden sm:inline">Draw together</span>
              </button>
              <ThemeToggle className="glass rounded-xl border" />
              {account ? (
                <div className="glass rounded-full border">
                  <UserMenu user={account} />
                </div>
              ) : (
                !authLoading && (
                  <button
                    onClick={() => setDialog({ kind: "auth", mode: "signin", next: "/" })}
                    className="glass inline-flex h-9 items-center rounded-xl border px-3 text-sm font-medium transition hover:bg-white/80 dark:hover:bg-white/10"
                  >
                    Sign in
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* Tools: left rail on larger screens */}
      <div className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 md:block">
        <ToolRail tool={tool} onToolChange={setTool} />
      </div>

      {/* Bottom bar(s); on phones the tools sit here too */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <StyleBar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          size={size}
          onSizeChange={setSize}
          font={font}
          onFontChange={setFont}
          canUndo={history.undo > 0}
          canRedo={history.redo > 0}
          onUndo={undo}
          onRedo={redo}
          onDownload={handleDownload}
          onClear={handleClear}
        />
        <ToolRail tool={tool} onToolChange={setTool} className="md:hidden" />
      </div>

      <ZoomControls
        zoom={view.zoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onReset={fitToContent}
        grid={grid}
        onGridChange={setGrid}
        className="absolute right-3 top-16 lg:bottom-3 lg:left-3 lg:right-auto lg:top-auto"
      />

      {hint && (
        <div
          role="status"
          className="glass pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full border px-4 py-1.5 text-sm font-medium duration-200 animate-in fade-in-0 slide-in-from-top-2"
        >
          {hint}
        </div>
      )}

      {dialog?.kind === "clear" && (
        <ConfirmDialog
          title={room ? "Clear for everyone?" : "Clear your board?"}
          message={
            room
              ? "This wipes the board for everyone in this room. It can't be undone."
              : "Everything on your board will be erased. This can't be undone."
          }
          confirmLabel="Clear board"
          danger
          icon={<Trash2 className="size-6" />}
          onConfirm={clearBoard}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === "rooms" && (
        <RoomsDialog user={account} onCreate={createLiveRoom} onJoin={joinRoom} onClose={closeDialog} />
      )}
      {dialog?.kind === "login" && (
        <LoginPrompt
          title={dialog.title}
          message={dialog.message}
          next={dialog.next}
          onEmail={(mode) => setDialog({ kind: "auth", mode, next: dialog.next })}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === "auth" && (
        <AuthDialog
          initialMode={dialog.mode}
          next={dialog.next}
          initialError={dialog.error}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
