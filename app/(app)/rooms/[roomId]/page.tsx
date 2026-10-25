import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import RoomCanvas from "@/components/room/room-canvas";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";
import { recordVisit } from "@/utils/rooms";

export default async function RoomPage({ params }: { params: { roomId: string } }) {
  const parsed = RoomIdSchema.safeParse(decodeURIComponent(params.roomId));
  if (!parsed.success) notFound();

  const roomId = normalizeRoomId(parsed.data);
  if (roomId !== params.roomId) redirect(`/rooms/${roomId}`);

  const session = await auth();
  const user = {
    id: session?.user?.id ?? "",
    name: session?.user?.name ?? session?.user?.email ?? "Guest",
    image: session?.user?.image ?? null,
  };
  if (user.id) await recordVisit(user.id, roomId);

  return <RoomCanvas roomId={roomId} user={user} />;
}
