"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import db from "@/lib/db";
import { generateRoomId } from "@/lib/room";
import { revokeRoomAccess } from "@/lib/room-token";
import { RoomIdSchema, RoomPasswordSchema } from "@/utils/schema";

type ActionResult = { error?: string; roomId?: string };

async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createRoom(password?: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Please sign in again." };

  let passwordHash: string | null = null;
  if (password !== undefined) {
    const parsed = RoomPasswordSchema.safeParse(password);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };
    passwordHash = await bcrypt.hash(parsed.data, 10);
  }

  // Codes are random; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomId = generateRoomId();
    try {
      await db.room.create({ data: { id: roomId, ownerId: userId, passwordHash } });
      await db.roomVisit.create({ data: { userId, roomId } });
      return { roomId };
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") {
        console.error("[rooms] Failed to create room", error);
        return { error: "Couldn't create the room. Please try again." };
      }
    }
  }
  return { error: "Couldn't create the room. Please try again." };
}

export async function unlockRoom(roomId: string, password: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Please sign in again." };
  const id = RoomIdSchema.safeParse(roomId);
  if (!id.success) return { error: "Room not found" };

  const room = await db.room.findUnique({
    where: { id: id.data },
    select: { passwordHash: true },
  });
  if (!room) return { error: "Room not found" };
  if (room.passwordHash && !(await bcrypt.compare(password, room.passwordHash))) {
    return { error: "Wrong password" };
  }

  await db.roomVisit.upsert({
    where: { userId_roomId: { userId, roomId: id.data } },
    create: { userId, roomId: id.data },
    update: { visitedAt: new Date() },
  });
  return { roomId: id.data };
}

// password: a new password (makes the room private / changes it), or null to make it public.
export async function updateRoomPassword(
  roomId: string,
  password: string | null
): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { error: "Please sign in again." };

  const room = await db.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  });
  if (!room || room.ownerId !== userId) {
    return { error: "Only the room owner can change this." };
  }

  if (password === null) {
    await db.room.update({ where: { id: roomId }, data: { passwordHash: null } });
    return { roomId };
  }

  const parsed = RoomPasswordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const updated = await db.room.update({
    where: { id: roomId },
    data: {
      passwordHash: await bcrypt.hash(parsed.data, 10),
      accessVersion: { increment: 1 },
    },
    select: { accessVersion: true },
  });
  // Everyone else has to enter the new password.
  await db.roomVisit.deleteMany({ where: { roomId, NOT: { userId } } });
  await revokeRoomAccess(roomId, updated.accessVersion);
  return { roomId };
}
