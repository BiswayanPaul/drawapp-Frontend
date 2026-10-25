"use client";

import {
  ArrowUpRight,
  Circle,
  Download,
  Eraser,
  Highlighter,
  Minus,
  Pencil,
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
  { tool: "pen", label: "Pen", key: "p", icon: Pencil },
  { tool: "highlighter", label: "Highlighter", key: "h", icon: Highlighter },
  { tool: "eraser", label: "Eraser", key: "e", icon: Eraser },
  { tool: "line", label: "Line", key: "l", icon: Minus },
  { tool: "arrow", label: "Arrow", key: "a", icon: ArrowUpRight },
  { tool: "rect", label: "Rectangle", key: "r", icon: Square },
  { tool: "ellipse", label: "Ellipse", key: "o", icon: Circle },
  { tool: "text", label: "Text", key: "t", icon: Type },
];

type ToolbarProps = {
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
};

export function Toolbar({
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
}: ToolbarProps) {
  const pickColor = (c: string) => {
    onColorChange(c);
    if (tool === "eraser") onToolChange("pen");
  };

  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border bg-card/95 p-1.5 shadow-xl backdrop-blur sm:p-2 dark:shadow-black/40">
      <div className="flex flex-wrap items-center justify-center gap-0.5">
        {TOOLS.map(({ tool: t, label, key, icon: Icon }) => (
          <ToolButton
            key={t}
            label={`${label} (${key.toUpperCase()})`}
            active={tool === t}
            onClick={() => onToolChange(t)}
          >
            <Icon className="size-[18px]" />
          </ToolButton>
        ))}
      </div>

      <Divider />

      <div className="flex items-center gap-1.5 px-1">
        {COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Color ${c}`}
            onClick={() => pickColor(c)}
            className={cn(
              "size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] ring-offset-2 ring-offset-card transition hover:scale-110 sm:size-7 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]",
              color === c && tool !== "eraser" && "ring-2 ring-foreground"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <label
          className={cn(
            "relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-offset-2 ring-offset-card transition hover:scale-110 sm:size-7",
            !COLORS.includes(color) && tool !== "eraser" && "ring-2 ring-foreground"
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

      <div className="flex items-center gap-0.5">
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
        <Divider />
        <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Download PNG" onClick={onDownload}>
          <Download className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Clear canvas" onClick={onClear} danger>
          <Trash2 className="size-[18px]" />
        </ToolButton>
      </div>
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

function Divider() {
  return <span className="mx-1 hidden h-6 w-px shrink-0 bg-border sm:block" />;
}
