"use client";

import {
  ArrowUpRight,
  Circle,
  ChevronsLeft,
  ChevronsRight,
  Eraser,
  Hand,
  Highlighter,
  Minus,
  PaintBucket,
  Pencil,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
  Check,
  ChevronDown,
  Grid3x3,
  Grip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GridMode, TextFont, Tool } from "@/lib/drawing";
import { TEXT_FONTS, textFont } from "@/lib/fonts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
// Brush size range for the slider (highlighter and eraser draw 2.5x wider).
export const MIN_SIZE = 1;
export const MAX_SIZE = 50;
export const DEFAULT_SIZE = 4;

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
export const PANEL = "glass pointer-events-auto rounded-2xl border";

// Tools: a vertical rail on the left on larger screens, a horizontal strip on phones.
// Collapsed, it shrinks to just the active tool; shortcuts keep working either way.
export function ToolRail({
  tool,
  onToolChange,
  collapsed,
  onToggleCollapsed,
  className,
}: {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  className?: string;
}) {
  const visible = collapsed ? TOOLS.filter((t) => t.tool === tool).slice(0, 1) : TOOLS;
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
      {visible.map(({ tool: t, label, key, icon: Icon }, i) => (
        <span key={t} className="contents">
          {!collapsed && i === 1 && <Divider className="md:mx-0 md:my-0.5 md:h-px md:w-6" />}
          <ToolButton
            label={`${label} (${key.toUpperCase()})`}
            active={tool === t}
            onClick={() => onToolChange(t)}
          >
            <Icon className="size-[18px]" />
          </ToolButton>
        </span>
      ))}
      <Divider className="md:mx-0 md:my-0.5 md:h-px md:w-6" />
      <ToolButton
        label={collapsed ? "Show all tools" : "Hide tools"}
        onClick={onToggleCollapsed}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </ToolButton>
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
  font: TextFont;
  onFontChange: (font: TextFont) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
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
  font,
  onFontChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
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
              "size-6 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] ring-offset-2 ring-offset-white/70 dark:ring-offset-slate-900 transition hover:scale-110 sm:size-7 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]",
              color === c && showActive && "ring-2 ring-foreground"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <label
          className={cn(
            "relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-offset-2 ring-offset-white/70 dark:ring-offset-slate-900 transition hover:scale-110 sm:size-7",
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

      <FontPicker
        font={font}
        active={tool === "text"}
        onChange={(f) => {
          onFontChange(f);
          onToolChange("text");
        }}
      />

      <Divider />

      <SizeSlider size={size} color={tool === "eraser" ? "#ffffff" : color} onChange={onSizeChange} />

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="size-[18px]" />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="size-[18px]" />
        </ToolButton>
      </div>
    </div>
  );
}

// Drag for any brush size; the dot previews it (capped so it fits the bar).
function SizeSlider({
  size,
  color,
  onChange,
}: {
  size: number;
  color: string;
  onChange: (size: number) => void;
}) {
  const dot = Math.max(3, Math.min(size, 26));
  const fill = ((size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)) * 100;
  return (
    <div className="flex shrink-0 items-center gap-2 px-1.5" title="Brush size ( [ and ] )">
      <span className="flex size-7 shrink-0 items-center justify-center">
        <span
          className="rounded-full shadow-[0_0_0_1px_rgba(100,116,139,0.45)] transition-[width,height]"
          style={{ width: dot, height: dot, backgroundColor: color }}
        />
      </span>
      <input
        type="range"
        min={MIN_SIZE}
        max={MAX_SIZE}
        step={1}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Brush size"
        className="size-slider w-24 sm:w-28"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
      />
      <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{size}</span>
    </div>
  );
}

// Text style menu; each option is shown in its own font.
function FontPicker({
  font,
  active,
  onChange,
}: {
  font: TextFont;
  active: boolean;
  onChange: (font: TextFont) => void;
}) {
  const current = textFont(font);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={`Text style: ${current.label}`}
        aria-label={`Text style: ${current.label}`}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-2.5 text-muted-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-accent text-accent-foreground" : "hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <span className={cn("text-lg leading-none", current.className)}>Aa</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={10} className="w-56 p-1.5">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Text style
        </DropdownMenuLabel>
        {TEXT_FONTS.map((f) => (
          <DropdownMenuItem
            key={f.key}
            onSelect={() => onChange(f.key)}
            className="cursor-pointer justify-between rounded-lg px-2.5 py-2 focus:bg-foreground/5"
          >
            <span className={cn("text-lg leading-tight", f.className)} style={{ fontWeight: f.weight }}>
              {f.label}
            </span>
            {f.key === font && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const GRID_NEXT: Record<GridMode, GridMode> = { lines: "dots", dots: "off", off: "lines" };
const GRID_LABEL: Record<GridMode, string> = {
  lines: "Grid: lines",
  dots: "Grid: dots",
  off: "Grid: off",
};

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  grid,
  onGridChange,
  className,
}: {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  grid: GridMode;
  onGridChange: (grid: GridMode) => void;
  className?: string;
}) {
  const GridIcon = grid === "dots" ? Grip : Grid3x3;
  return (
    <div className={cn(PANEL, "flex items-center gap-0.5 p-1", className)}>
      <ToolButton
        label={`${GRID_LABEL[grid]} — click to switch (G)`}
        active={grid !== "off"}
        onClick={() => onGridChange(GRID_NEXT[grid])}
      >
        <GridIcon className={cn("size-4", grid === "off" && "opacity-50")} />
      </ToolButton>
      <Divider />
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
          : "hover:bg-foreground/5 hover:text-foreground",
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
