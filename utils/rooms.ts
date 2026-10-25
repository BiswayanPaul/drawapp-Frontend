import db from "@/lib/db";
import { elementsToSvg, type DrawElement } from "@/lib/drawing";

export async function getRoomAccess(roomId: string, userId: string) {
  // Whoever opens a brand-new room code first owns it.
  let room = await db.room.upsert({
    where: { id: roomId },
    create: { id: roomId, ownerId: userId },
    update: {},
    select: { ownerId: true, passwordHash: true, accessVersion: true },
  });
  if (!room.ownerId && !room.passwordHash) {
    // Rooms from before ownership existed: the next visitor claims them.
    room = await db.room.update({
      where: { id: roomId },
      data: { ownerId: userId },
      select: { ownerId: true, passwordHash: true, accessVersion: true },
    });
  }

  const isOwner = room.ownerId === userId;
  const isPrivate = room.passwordHash !== null;
  // For private rooms a visit row is only written after the password was entered.
  const hasAccess =
    !isPrivate ||
    isOwner ||
    (await db.roomVisit.findUnique({
      where: { userId_roomId: { userId, roomId } },
      select: { userId: true },
    })) !== null;

  return { isOwner, isPrivate, hasAccess, accessVersion: room.accessVersion };
}

export async function recordVisit(userId: string, roomId: string) {
  try {
    await db.roomVisit.upsert({
      where: { userId_roomId: { userId, roomId } },
      create: { userId, roomId },
      update: { visitedAt: new Date() },
    });
  } catch (error) {
    // Never block entering a room on bookkeeping.
    console.error("[rooms] Failed to record visit", error);
  }
}

export async function getRecentRooms(userId: string, take = 6) {
  try {
    const visits = await db.roomVisit.findMany({
      where: { userId },
      orderBy: { visitedAt: "desc" },
      take,
      include: { room: { select: { elements: true, passwordHash: true } } },
    });
    return visits.map((visit) => {
      const elements = (visit.room.elements ?? []) as DrawElement[];
      return {
        id: visit.roomId,
        visitedAt: visit.visitedAt,
        isPrivate: visit.room.passwordHash !== null,
        thumbnail: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(elementsToSvg(elements))}`,
      };
    });
  } catch (error) {
    console.error("[rooms] Failed to load recent rooms", error);
    return [];
  }
}
