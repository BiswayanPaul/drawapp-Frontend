import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, RoomUser, ServerMessage } from "@/lib/drawing";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://drawapp-backend-gzkk.onrender.com";

export type SocketStatus = "connecting" | "open" | "reconnecting" | "denied";

// Close code the realtime server uses when a room token is invalid or revoked.
const ACCESS_REVOKED = 4003;

export function useRoomSocket(
  roomId: string,
  token: string | null,
  user: RoomUser,
  onMessage: (message: ServerMessage) => void,
  onDenied: () => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const userRef = useRef(user);
  const onDeniedRef = useRef(onDenied);
  const [status, setStatus] = useState<SocketStatus>("connecting");

  useEffect(() => {
    onMessageRef.current = onMessage;
    userRef.current = user;
    onDeniedRef.current = onDenied;
  });

  useEffect(() => {
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const connect = () => {
      const params = new URLSearchParams({ roomId });
      if (token) params.set("token", token);
      const ws = new WebSocket(`${WS_URL}?${params}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
        ws.send(JSON.stringify({ type: "join", user: userRef.current }));
      };
      ws.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch (error) {
          console.error("Bad message from server", error);
        }
      };
      ws.onclose = (event) => {
        if (disposed) return;
        if (event.code === ACCESS_REVOKED) {
          // Retrying with the same token won't help; the page fetches a new one.
          setStatus("denied");
          onDeniedRef.current();
          return;
        }
        setStatus("reconnecting");
        // Render's free tier sleeps; back off while it wakes up.
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 10000));
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [roomId, token]);

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  }, []);

  return { status, send };
}
