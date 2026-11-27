"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Clock, Loader2, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";
import { elementsToSvg } from "@/lib/drawing";
import { WS_URL } from "@/hooks/useRoomSocket";
import { cn } from "@/lib/utils";
import { api, type ApiUser, type RecentRoom } from "@/lib/api";

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

const FIELD = "h-11 bg-white/60 dark:bg-white/5";

export function RoomsDialog({
  user,
  onCreate,
  onJoin,
  onClose,
}: {
  user: ApiUser | null;
  // Throws with a user-facing message on failure.
  onCreate: (password?: string) => Promise<void>;
  onJoin: (roomId: string) => void;
  onClose: () => void;
}) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string>();
  const [recent, setRecent] = useState<RecentRoom[] | null>(null);

  // Wake the (sleeping) realtime server early so the room connects faster.
  useEffect(() => {
    fetch(`${WS_URL.replace(/^ws/, "http")}/health`, { mode: "no-cors" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .recentRooms()
      .then(({ rooms }) => setRecent(rooms))
      .catch(() => setRecent([]));
  }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(undefined);
    try {
      await onCreate(isPrivate ? password : undefined);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Couldn't create the room.");
      setCreating(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = RoomIdSchema.safeParse(code);
    if (!parsed.success) {
      setJoinError(parsed.error.issues[0]?.message);
      return;
    }
    onJoin(normalizeRoomId(parsed.data));
  };

  return (
    <GlassDialog onClose={onClose} labelledBy="rooms-title" className="max-w-lg">
      <h2 id="rooms-title" className="pr-6 text-xl font-bold">
        Draw together
      </h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Start a live room from this board, or join one with a code.
      </p>

      <form onSubmit={create} className="space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white/40 px-3 py-2.5 dark:bg-white/5">
          <span className="flex items-center gap-2.5">
            <Lock className="size-4 text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium">Private room</span>
              <span className="block text-xs text-muted-foreground">
                Only people with the password can join
              </span>
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={isPrivate}
            onChange={(e) => {
              setIsPrivate(e.target.checked);
              setCreateError(undefined);
            }}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={cn(
              "relative h-6 w-11 shrink-0 rounded-full bg-foreground/15 transition peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
              "after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition",
              isPrivate && "bg-primary after:translate-x-5"
            )}
          />
        </label>
        {isPrivate && (
          <Input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setCreateError(undefined);
            }}
            placeholder="Room password (min. 4 characters)"
            autoComplete="new-password"
            autoFocus
            className={FIELD}
          />
        )}
        {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
        <Button
          type="submit"
          disabled={creating || (isPrivate && password.length < 4)}
          className="h-11 w-full text-base"
        >
          {creating ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Plus className="mr-2 size-5" />}
          {isPrivate ? "Start a private room" : "Start a live room"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Your current drawing comes along.
        </p>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-foreground/10" />
        or join one
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

      <form onSubmit={join} className="space-y-2">
        <label htmlFor="room-code" className="sr-only">
          Room code
        </label>
        <div className="flex gap-2">
          <Input
            id="room-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setJoinError(undefined);
            }}
            placeholder="Room code, e.g. K7Q2ZP"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!joinError}
            className={cn(
              FIELD,
              "font-mono text-base uppercase tracking-[0.2em] placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal"
            )}
          />
          <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0 bg-white/60 dark:bg-white/5" aria-label="Join room">
            <ArrowRight className="size-5" />
          </Button>
        </div>
        {joinError && <p className="text-sm text-red-600 dark:text-red-400">{joinError}</p>}
      </form>

      {user && recent && recent.length > 0 && (
        <section className="mt-7">
          <h3 className="mb-3 text-sm font-semibold">Recent rooms</h3>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {recent.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.id}`}
                  className="group block overflow-hidden rounded-xl border bg-white/50 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(elementsToSvg(room.elements))}`}
                    alt={`Drawing in room ${room.id}`}
                    className="aspect-[16/10] w-full border-b bg-white object-cover"
                  />
                  <div className="px-2.5 py-1.5">
                    <p className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-widest group-hover:text-primary">
                      {room.id}
                      {room.isPrivate && <Lock className="size-3 text-muted-foreground" aria-label="Private" />}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {timeAgo(new Date(room.visitedAt))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {user && recent === null && (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Loading recent rooms…
        </p>
      )}
    </GlassDialog>
  );
}
