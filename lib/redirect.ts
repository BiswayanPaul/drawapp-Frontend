// Where to send someone after they sign in. Only same-site paths are allowed so a
// crafted ?next= link can't bounce people to another website.
export function safeNext(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    value.length <= 200
    ? value
    : "/";
}

// Reads ?next= from the current URL (client only).
export function currentNext() {
  if (typeof window === "undefined") return "/";
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}

export function withNext(path: string, next: string) {
  const target = safeNext(next);
  return target === "/" ? path : `${path}?next=${encodeURIComponent(target)}`;
}
