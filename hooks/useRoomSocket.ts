import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ServerMessage } from "@/lib/drawing";

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://drawapp-backend-gzkk.onrender.com";

export type SocketStatus = "connecting" | "open" | "reconnecting";

export function useRoomSocket(
  roomId: string,
  onMessage: (message: ServerMessage) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const [status, setStatus] = useState<SocketStatus>("connecting");

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout>;
    let disposed = false;

    const connect = () => {
      const ws = new WebSocket(
        `${WS_URL}?roomId=${encodeURIComponent(roomId)}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus("open");
      };
      ws.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch (error) {
          console.error("Bad message from server", error);
        }
      };
      ws.onclose = () => {
        if (disposed) return;
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
  }, [roomId]);

  const send = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  }, []);

  return { status, send };
}
