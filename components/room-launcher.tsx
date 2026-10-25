"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoomIdSchema } from "@/utils/schema";
import { generateRoomId, normalizeRoomId } from "@/lib/room";
import { WS_URL } from "@/hooks/useRoomSocket";

export default function RoomLauncher() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState<string>();

  // Wake the (sleeping) realtime server early so the room connects faster.
  useEffect(() => {
    fetch(`${WS_URL.replace(/^ws/, "http")}/health`, { mode: "no-cors" }).catch(
      () => {}
    );
  }, []);

  const handleCreateRoom = () => {
    router.push(`/rooms/${generateRoomId()}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = RoomIdSchema.safeParse(roomId);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    router.push(`/rooms/${normalizeRoomId(parsed.data)}`);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
      <h2 className="text-lg font-semibold text-slate-900">Start drawing</h2>
      <p className="mb-5 text-sm text-slate-500">
        Create a new room and share the code with others.
      </p>
      <Button onClick={handleCreateRoom} className="h-12 w-full text-base">
        <Plus className="mr-2 size-5" />
        Create a new room
      </Button>

      <div className="relative my-7 text-center text-xs uppercase tracking-wider text-slate-400">
        <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
        <span className="relative bg-white px-3">or join one</span>
      </div>

      <form onSubmit={handleJoinRoom} className="space-y-2">
        <label htmlFor="room-code" className="text-sm font-medium text-slate-700">
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
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
