"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Whiteboard from "@/components/room/whiteboard";
import RoomLock from "@/components/room/room-lock";
import { LoginRequired } from "@/components/auth/login-prompt";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";
import { api, type RoomAccess } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const parsed = RoomIdSchema.safeParse(decodeURIComponent(params.roomId));
  const roomId = parsed.success ? normalizeRoomId(parsed.data) : null;
  const [access, setAccess] = useState<RoomAccess | null>(null);
  const [error, setError] = useState<string>();

  const loadAccess = useCallback(async () => {
    if (!roomId) return;
    setError(undefined);
    try {
      setAccess(await api.roomAccess(roomId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Couldn't open this room.");
    }
  }, [roomId]);

  useEffect(() => {
    if (!parsed.success) {
      router.replace("/");
      return;
    }
    if (roomId !== params.roomId) {
      router.replace(`/rooms/${roomId}`);
      return;
    }
    if (user) void loadAccess();
    else setAccess(null);
  }, [loadAccess, params.roomId, parsed.success, roomId, router, user]);

  if (!roomId || roomId !== params.roomId || loading) return null;

  // Rooms are shared with other people, so they need an account.
  if (!user) {
    return (
      <LoginRequired
        title={`Sign in to join room ${roomId}`}
        message="Live rooms need an account so others can see who's drawing. You'll come straight back here."
        next={`/rooms/${roomId}`}
      >
        <Link
          href="/draw"
          className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          Or draw on your own without an account →
        </Link>
      </LoginRequired>
    );
  }

  if (!access) {
    return error ? (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => void loadAccess()}
          className="text-sm font-medium text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    ) : null;
  }
  if (!access.hasAccess) return <RoomLock roomId={roomId} onUnlocked={() => void loadAccess()} />;

  return (
    <Whiteboard
      key={roomId}
      room={{
        roomId,
        user: { id: user.id, name: user.name ?? user.email, image: user.image },
        token: access.token,
        isOwner: access.isOwner,
        isPrivate: access.isPrivate,
        onAccessLost: () => void loadAccess(),
      }}
    />
  );
}
