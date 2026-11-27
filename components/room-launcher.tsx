"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Lock, PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";
import { WS_URL } from "@/hooks/useRoomSocket";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { LoginPrompt } from "@/components/auth/login-prompt";

type Prompt = { title: string; message: string; next: string };

export default function RoomLauncher() {
  const router = useRouter();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string>();
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState<string>();
  const [creating, setCreating] = useState(false);

  // Wake the (sleeping) realtime server early so the room connects faster.
  useEffect(() => {
    fetch(`${WS_URL.replace(/^ws/, "http")}/health`, { mode: "no-cors" }).catch(
      () => {}
    );
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setPrompt({
        title: "Sign in to create a room",
        message: "Rooms are shared live with others, so they need an account. Drawing on your own doesn't.",
        next: "/",
      });
      return;
    }
    setCreating(true);
    setCreateError(undefined);
    try {
      const result = await api.createRoom(isPrivate ? password : undefined);
      router.push(`/rooms/${result.roomId}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Couldn't create the room.");
      setCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = RoomIdSchema.safeParse(roomId);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    const path = `/rooms/${normalizeRoomId(parsed.data)}`;
    if (!user) {
      setPrompt({
        title: "Sign in to join this room",
        message: "You'll be taken straight into the room once you're signed in.",
        next: path,
      });
      return;
    }
    router.push(path);
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-slate-200/60 sm:p-8 dark:shadow-black/30">
      <h2 className="text-lg font-semibold">Start drawing</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Sketch on your own right away — no account needed.
      </p>
      <Button asChild variant="outline" className="h-12 w-full text-base">
        <Link href="/draw">
          <PenLine className="mr-2 size-5" />
          Open a blank board
        </Link>
      </Button>

      <div className="relative my-7 text-center text-xs uppercase tracking-wider text-muted-foreground">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className="relative bg-card px-3">or draw together</span>
      </div>

      <form onSubmit={handleCreateRoom} className="space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
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
              "relative h-6 w-11 shrink-0 rounded-full bg-input transition peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
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
            className="h-11"
          />
        )}
        {createError && (
          <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
        )}
        <Button
          type="submit"
          disabled={creating || (isPrivate && password.length < 4)}
          className="h-12 w-full text-base"
        >
          {creating ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <Plus className="mr-2 size-5" />
          )}
          {isPrivate ? "Create private room" : "Create a new room"}
        </Button>
      </form>

      <div className="relative my-7 text-center text-xs uppercase tracking-wider text-muted-foreground">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className="relative bg-card px-3">or join one</span>
      </div>

      <form onSubmit={handleJoinRoom} className="space-y-2">
        <label htmlFor="room-code" className="text-sm font-medium">
          Room code
        </label>
        <div className="flex gap-2">
          <Input
            id="room-code"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value.toUpperCase());
              setError(undefined);
            }}
            placeholder="e.g. K7Q2ZP"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            className="h-12 font-mono text-base uppercase tracking-[0.2em] placeholder:normal-case placeholder:tracking-normal"
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="size-12 shrink-0"
            aria-label="Join room"
          >
            <ArrowRight className="size-5" />
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
      {prompt && <LoginPrompt {...prompt} onClose={() => setPrompt(null)} />}
    </div>
  );
}
