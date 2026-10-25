import Link from "next/link";
import { Clock, Lock } from "lucide-react";

type RecentRoom = {
  id: string;
  visitedAt: Date;
  isPrivate: boolean;
  thumbnail: string;
};

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(date: Date) {
  const seconds = (date.getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secondsInUnit] of units) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return relative.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return "just now";
}

export default function RecentRooms({ rooms }: { rooms: RecentRoom[] }) {
  if (rooms.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-12">
      <h2 className="mb-4 text-lg font-semibold">Recent rooms</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              href={`/rooms/${room.id}`}
              className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={room.thumbnail}
                alt={`Drawing in room ${room.id}`}
                className="aspect-[16/10] w-full border-b bg-white object-cover"
              />
              <div className="px-3 py-2">
                <p className="flex items-center gap-1.5 font-mono text-sm font-semibold tracking-widest group-hover:text-primary">
                  {room.id}
                  {room.isPrivate && (
                    <Lock className="size-3.5 text-muted-foreground" aria-label="Private" />
                  )}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {timeAgo(room.visitedAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
