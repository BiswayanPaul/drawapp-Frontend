"use client";

import { useRouter } from "next/navigation";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  Eraser,
  Link2,
  LogOut,
  Paintbrush,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import {
  CANVAS_BACKGROUND,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  Member,
  Point,
  RoomUser,
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
  user: RoomUser;
}

const Canvas: FC<CanvasProps> = ({ roomId, user }) => {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevPoint = useRef<Point | null>(null);
  // Strokes drawn while offline; sent once the server hands us its history.
  const pending = useRef<Segment[]>([]);

  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[0]);
  const [erasing, setErasing] = useState(false);
  const [peers, setPeers] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
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
        if (Array.isArray(message.users)) setMembers(message.users);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { status, send } = useRoomSocket(roomId, user, handleMessage);

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
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Link2 className="size-4" />
            )}
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
      <div className="flex items-start justify-center px-3 sm:flex-1 sm:px-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "h-auto max-h-[calc(100dvh-13.5rem)] w-auto max-w-full touch-none rounded-xl bg-white shadow-lg ring-1 ring-border dark:shadow-black/40",
            erasing ? "cursor-cell" : "cursor-crosshair"
          )}
        />
      </div>

      {/* Toolbar */}
      <div className="flex justify-center px-3 py-3 sm:sticky sm:bottom-0 sm:px-4 sm:py-4">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-xl backdrop-blur sm:p-2 dark:shadow-black/40">
          <div className="flex items-center gap-1">
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
          </div>

          <Divider />

          <div className="flex items-center gap-1.5 px-1">
            {COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Color ${c}`}
                onClick={() => {
                  setColor(c);
                  setErasing(false);
                }}
                className={cn(
                  "size-6 shrink-0 rounded-full ring-offset-2 ring-offset-card transition hover:scale-110 sm:size-7",
                  color === c && !erasing && "ring-2 ring-foreground"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] transition hover:scale-110 sm:size-7"
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
          </div>

          <Divider />

          <div className="flex items-center gap-1">
            {SIZES.map((s) => (
              <ToolButton
                key={s}
                label={`Brush size ${s}`}
                active={size === s}
                onClick={() => setSize(s)}
              >
                <span
                  className="rounded-full bg-foreground"
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
    </div>
  );
};

function PeopleMenu({
  members,
  fallbackCount,
  me,
}: {
  members: Member[];
  fallbackCount: number;
  me: RoomUser;
}) {
  // Merge multiple tabs of the same account into one row.
  const people = Array.from(
    members
      .reduce((map, member) => {
        const key = member.userId || member.connectionId;
        const existing = map.get(key);
        map.set(key, { ...member, tabs: (existing?.tabs ?? 0) + 1 });
        return map;
      }, new Map<string, Member & { tabs: number }>())
      .values()
  ).sort((a, b) => Number(b.userId === me.id) - Number(a.userId === me.id));
  const count = people.length || fallbackCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary sm:px-3">
        <Users className="size-4" />
        <span className="font-medium text-foreground">{count}</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          In this room · {count}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {people.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Waiting for the server…
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {people.map((person) => (
              <li
                key={person.userId || person.connectionId}
                className="flex items-center gap-2.5 rounded-sm px-2 py-1.5"
              >
                <Avatar name={person.name} image={person.image} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {person.name}
                  {person.userId === me.id && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </span>
                {person.tabs > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {person.tabs} tabs
                  </span>
                )}
                <span className="size-2 rounded-full bg-green-500" />
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition sm:size-10",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-secondary hover:text-foreground",
        danger &&
          "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" />;
}

function StatusBadge({ status }: { status: SocketStatus }) {
  const config = {
    open: { label: "Live", dot: "bg-green-500" },
    connecting: { label: "Connecting…", dot: "bg-amber-400 animate-pulse" },
    reconnecting: { label: "Reconnecting…", dot: "bg-amber-400 animate-pulse" },
  }[status];

  return (
    <span
      className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm sm:px-3"
      title={
        status === "open"
          ? "Connected to the drawing server"
          : "The server may take up to a minute to wake up"
      }
    >
      <span className={cn("size-2 rounded-full", config.dot)} />
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}

export default Canvas;
