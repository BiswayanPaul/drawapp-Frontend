"use client";

import {
  ArrowUpRight,
  Circle,
  Download,
  Eraser,
  Hand,
  Highlighter,
  Minus,
  PaintBucket,
  Pencil,
  Plus,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tool } from "@/lib/drawing";

export const COLORS = [
  "#0f172a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
export const SIZES = [4, 10, 24];

export const TOOLS: { tool: Tool; label: string; key: string; icon: typeof Pencil }[] = [
  { tool: "hand", label: "Hand — or hold Space", key: "m", icon: Hand },
  { tool: "pen", label: "Pen", key: "p", icon: Pencil },
  { tool: "highlighter", label: "Highlighter", key: "h", icon: Highlighter },
  { tool: "eraser", label: "Eraser", key: "e", icon: Eraser },
  { tool: "line", label: "Line", key: "l", icon: Minus },
  { tool: "arrow", label: "Arrow", key: "a", icon: ArrowUpRight },
  { tool: "rect", label: "Rectangle", key: "r", icon: Square },
  { tool: "ellipse", label: "Ellipse", key: "o", icon: Circle },
  { tool: "text", label: "Text", key: "t", icon: Type },
  { tool: "fill", label: "Fill closed shape", key: "f", icon: PaintBucket },
];

// Shared look for every floating panel over the board.
export const PANEL =
  "pointer-events-auto rounded-2xl border bg-card/95 shadow-xl backdrop-blur dark:shadow-black/40";

// Tools: a vertical rail on the left on larger screens, a horizontal strip on phones.
export function ToolRail({
  tool,
  onToolChange,
  className,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  className?: string;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className={cn(
        PANEL,
        "flex max-w-full items-center gap-0.5 overflow-x-auto p-1.5 md:flex-col md:overflow-visible",
        className
      )}
    >
      {TOOLS.map(({ tool: t, label, key, icon: Icon }, i) => (
        <span key={t} className="contents">
          {i === 1 && <Divider className="md:mx-0 md:my-0.5 md:h-px md:w-6" />}
          <ToolButton
            label={`${label} (${key.toUpperCase()})`}
            active={tool === t}
            onClick={() => onToolChange(t)}
          >
            <Icon className="size-[18px]" />
          </ToolButton>
        </span>
      ))}
    </div>
  );
}

type StyleBarProps = {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  size: number;
  onSizeChange: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onClear: () => void;
  className?: string;
};

// Colour, size and board actions: floats along the bottom edge.
export function StyleBar({
  tool,
  onToolChange,
  color,
  onColorChange,
  size,
  onSizeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDownload,
  onClear,
  className,
}: StyleBarProps) {
  const pickColor = (c: string) => {
    onColorChange(c);
    if (tool === "eraser" || tool === "hand") onToolChange("pen");
  };
  const showActive = tool !== "eraser" && tool !== "hand";

  return (
    <div
      className={cn(
        PANEL,
        "flex max-w-full items-center gap-1 overflow-x-auto p-1.5 [scrollbar-width:none]",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 px-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => pickColor(c)}
            className={cn(
              "size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] ring-offset-2 ring-offset-card transition hover:scale-110 sm:size-7 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]",
              color === c && showActive && "ring-2 ring-foreground"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <label
          className={cn(
            "relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-offset-2 ring-offset-card transition hover:scale-110 sm:size-7",
            !COLORS.includes(color) && showActive && "ring-2 ring-foreground"
          )}
          title="Custom color"
        >
          <input
            type="color"
            value={color}
            onChange={(e) => pickColor(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        {SIZES.map((s) => (
          <ToolButton
            key={s}
            label={`Size ${s}`}
            active={size === s}
            onClick={() => onSizeChange(s)}
          >
            <span
              className="rounded-full bg-foreground"
              style={{ width: 4 + s / 2, height: 4 + s / 2 }}
            />
          </ToolButton>
        ))}
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Download PNG" onClick={onDownload}>
          <Download className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Clear board" onClick={onClear} danger>
          <Trash2 className="size-[18px]" />
        </ToolButton>
      </div>
    </div>
  );
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div className={cn(PANEL, "flex items-center gap-0.5 p-1", className)}>
      <ToolButton label="Zoom out (Ctrl -)" onClick={onZoomOut}>
        <Minus className="size-4" />
      </ToolButton>
      <button
        type="button"
        onClick={onReset}
        title="Reset view (Ctrl 0)"
        className="h-9 min-w-[3.5rem] rounded-xl px-1.5 text-xs font-medium tabular-nums text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolButton label="Zoom in (Ctrl +)" onClick={onZoomIn}>
        <Plus className="size-4" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  active,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition disabled:pointer-events-none disabled:opacity-35",
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

function Divider({ className }: { className?: string }) {
  return <span className={cn("mx-0.5 h-6 w-px shrink-0 bg-border", className)} />;
}
