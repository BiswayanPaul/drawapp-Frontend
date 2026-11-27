import {
  Bangers,
  Caveat,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Space_Mono,
} from "next/font/google";

// Text styles for the board. Keys are what gets stored on text elements, so they
// must match the backend's allowlist (drawapp-backend/src/elements.ts).
export type TextFont = "sans" | "hand" | "marker" | "script" | "serif" | "mono" | "comic";

const caveat = Caveat({ subsets: ["latin"], display: "swap" });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const bangers = Bangers({ subsets: ["latin"], weight: "400", display: "swap" });

const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";

export const TEXT_FONTS: {
  key: TextFont;
  label: string;
  family: string;
  weight: number;
  className?: string;
}[] = [
  { key: "sans", label: "Clean", family: SANS, weight: 600 },
  { key: "hand", label: "Handwritten", family: `${caveat.style.fontFamily}, cursive`, weight: 600, className: caveat.className },
  { key: "marker", label: "Marker", family: `${marker.style.fontFamily}, cursive`, weight: 400, className: marker.className },
  { key: "script", label: "Script", family: `${pacifico.style.fontFamily}, cursive`, weight: 400, className: pacifico.className },
  { key: "serif", label: "Elegant", family: `${playfair.style.fontFamily}, Georgia, serif`, weight: 600, className: playfair.className },
  { key: "comic", label: "Comic", family: `${bangers.style.fontFamily}, Impact, fantasy`, weight: 400, className: bangers.className },
  { key: "mono", label: "Typewriter", family: `${spaceMono.style.fontFamily}, ui-monospace, monospace`, weight: 700, className: spaceMono.className },
];

export function textFont(key: TextFont | undefined) {
  return TEXT_FONTS.find((f) => f.key === key) ?? TEXT_FONTS[0];
}

// CSS font shorthand for canvas text.
export function canvasFont(key: TextFont | undefined, px: number) {
  const font = textFont(key);
  return `${font.weight} ${px}px ${font.family}`;
}

// Font files only download once something asks for them; the canvas has to ask
// explicitly, then redraw when they arrive.
export function loadTextFonts() {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.all(
    TEXT_FONTS.map((f) => document.fonts.load(canvasFont(f.key, 32)).catch(() => []))
  ).then(() => undefined);
}
