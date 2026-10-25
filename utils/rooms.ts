import db from "@/lib/db";
import { elementsToSvg, type DrawElement } from "@/lib/drawing";

export async function recordVisit(userId: string, roomId: string) {
  try {
    await db.room.upsert({ where: { id: roomId }, create: { id: roomId }, update: {} });
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
      include: { room: { select: { elements: true } } },
    });
    return visits.map((visit) => {
      const elements = (visit.room.elements ?? []) as DrawElement[];
      return {
        id: visit.roomId,
        visitedAt: visit.visitedAt,
        elementCount: elements.length,
        thumbnail: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(elementsToSvg(elements))}`,
      };
    });
  } catch (error) {
    console.error("[rooms] Failed to load recent rooms", error);
    return [];
  }
}
