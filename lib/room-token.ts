import { createHmac } from "crypto";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// Short-lived pass for the realtime server, minted only after the room page has
// checked access. drawapp-backend verifies it with the same ROOM_TOKEN_SECRET.
export function createRoomToken(input: {
  roomId: string;
  userId: string;
  name: string;
  image: string | null;
  accessVersion: number;
}) {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return null;
  const payload = Buffer.from(
    JSON.stringify({
      r: input.roomId,
      u: input.userId,
      n: input.name,
      i: input.image,
      v: input.accessVersion,
      exp: Date.now() + TOKEN_TTL_MS,
    })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

// Disconnects everyone holding a token older than accessVersion. Best effort: the
// realtime server also rejects stale tokens on its own when it next loads the room.
export async function revokeRoomAccess(roomId: string, accessVersion: number) {
  const secret = process.env.ROOM_TOKEN_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "wss://drawapp-backend-gzkk.onrender.com";
  if (!secret) return;
  try {
    await fetch(`${wsUrl.replace(/^ws/, "http")}/internal/rooms/${roomId}/revoke`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ accessVersion }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    console.error("[rooms] Failed to notify realtime server", error);
  }
}
