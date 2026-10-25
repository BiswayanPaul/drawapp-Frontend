import { cn } from "@/lib/utils";

export function Avatar({
  name,
  image,
  className,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  if (image) {
    return (
      // Avatars can come from any provider, so skip next/image's host allowlist.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("size-7 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  const initials = (name ?? "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground",
        className
      )}
    >
      {initials || "?"}
    </span>
  );
}
