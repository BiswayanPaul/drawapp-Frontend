import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import RoomCanvas from "@/components/room/room-canvas";
import RoomLock from "@/components/room/room-lock";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";
import { createRoomToken } from "@/lib/room-token";
import { getRoomAccess, recordVisit } from "@/utils/rooms";

export default async function RoomPage({ params }: { params: { roomId: string } }) {
  const parsed = RoomIdSchema.safeParse(decodeURIComponent(params.roomId));
  if (!parsed.success) notFound();

  const roomId = normalizeRoomId(parsed.data);
  if (roomId !== params.roomId) redirect(`/rooms/${roomId}`);

  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const user = {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "Guest",
    image: session.user.image ?? null,
  };

  const access = await getRoomAccess(roomId, user.id);
  if (!access.hasAccess) return <RoomLock roomId={roomId} />;

  await recordVisit(user.id, roomId);
  const token = createRoomToken({
    roomId,
    userId: user.id,
    name: user.name,
    image: user.image,
    accessVersion: access.accessVersion,
  });

  return (
    <RoomCanvas
      roomId={roomId}
      user={user}
      token={token}
      isOwner={access.isOwner}
      isPrivate={access.isPrivate}
    />
  );
}
