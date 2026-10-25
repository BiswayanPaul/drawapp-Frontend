// No 0/O or 1/I so codes are easy to read aloud.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomId(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeRoomId(roomId: string) {
  return roomId.trim().toUpperCase();
}
