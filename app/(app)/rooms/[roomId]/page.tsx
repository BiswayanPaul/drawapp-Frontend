"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoomCanvas from "@/components/room/room-canvas";
import RoomLock from "@/components/room/room-lock";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";
import { api, type RoomAccess } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
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
  }, [loadAccess, params.roomId, parsed.success, roomId, router, user]);

  if (!roomId || roomId !== params.roomId || !user || !access) {
    return error ? <p className="p-6 text-sm text-red-600">{error}</p> : null;
  }
  if (!access.hasAccess) return <RoomLock roomId={roomId} onUnlocked={() => void loadAccess()} />;

  return (
    <RoomCanvas
      roomId={roomId}
      user={{ id: user.id, name: user.name ?? user.email, image: user.image }}
      token={access.token}
      isOwner={access.isOwner}
      isPrivate={access.isPrivate}
      onAccessLost={() => void loadAccess()}
    />
  );
}
