"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Modal used for every popup over the board: a lightly blurred backdrop with a
// frosted-glass panel. Sheets up from the bottom on phones, centred elsewhere.
export function GlassDialog({
  onClose,
  labelledBy,
  className,
  children,
}: {
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="glass-backdrop fixed inset-0 z-50 flex items-end justify-center p-3 duration-200 animate-in fade-in-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "glass relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-3xl border p-6 duration-200 animate-in fade-in-0 slide-in-from-bottom-4 sm:p-8 sm:zoom-in-95 sm:slide-in-from-bottom-0",
          className
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Same panel, not modal: for pages that are only a card over the board backdrop.
export function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-3 py-12">
      <div
        className={cn(
          "glass w-full max-w-sm rounded-3xl border p-6 text-center duration-300 animate-in fade-in-0 zoom-in-95 sm:p-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
