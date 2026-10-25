import { notFound, redirect } from "next/navigation";
import Canvas from "@/components/canvas";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";

export default function RoomPage({ params }: { params: { roomId: string } }) {
  const parsed = RoomIdSchema.safeParse(decodeURIComponent(params.roomId));
  if (!parsed.success) notFound();

  const roomId = normalizeRoomId(parsed.data);
  if (roomId !== params.roomId) redirect(`/rooms/${roomId}`);

  return <Canvas roomId={roomId} />;
}
