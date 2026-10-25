import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import Canvas from "@/components/canvas";
import { RoomIdSchema } from "@/utils/schema";
import { normalizeRoomId } from "@/lib/room";

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

  return <Canvas roomId={roomId} user={user} />;
}
