import { toScreen, type Member, type View } from "@/lib/drawing";

// x/y are world coordinates; they're projected through this client's camera.
export type RemoteCursor = { x: number; y: number; seen: number };

const CURSOR_COLORS = ["#e11d48", "#2563eb", "#16a34a", "#d97706", "#9333ea", "#0891b2"];

function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function RemoteCursors({
  cursors,
  members,
  view,
}: {
  cursors: Record<string, RemoteCursor>;
  members: Member[];
  view: View;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.entries(cursors).map(([id, cursor]) => {
        const color = colorFor(id);
        const name = members.find((m) => m.connectionId === id)?.name ?? "Guest";
        const at = toScreen(view, cursor);
        return (
          <div
            key={id}
            className="absolute left-0 top-0 will-change-transform"
            style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow">
              <path
                d="M2 1.5 15.5 8 9 9.5 6.5 16z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-3 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow"
              style={{ backgroundColor: color }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
