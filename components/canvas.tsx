"use client";

import { useDraw } from "@/hooks/useDraw";
import { FC, useEffect, useState } from "react";
import { ChromePicker } from "react-color";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

interface pageProps {
  roomId: string; // Add roomId as a prop
}

const Canvas: FC<pageProps> = ({ roomId }) => {
  const [color, setColor] = useState<string>("red");
  const { canvasRef, onMouseDown, clear } = useDraw(drawLine);
  const router = useRouter();
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(
      `wss://drawapp-backend-gzkk.onrender.com?roomId=${roomId}`
    );

    websocket.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "draw") {
        drawLineFromData(data);
      } else if (data.type === "clear") {
        clear(); // Clear canvas for all users
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [roomId]); // Only depend on roomId

  function drawLine({ prevPoint, currentPoint, ctx }: Draw) {
    const { x: currX, y: currY } = currentPoint;
    const lineColor = color;
    const lineWidth = 5;

    const startPoint = prevPoint ?? currentPoint;
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(currX, currY);
    ctx.stroke();

    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, 2, 0, 2 * Math.PI);
    ctx.fill();

    // Send drawing data to the WebSocket server
    if (ws) {
      ws.send(
        JSON.stringify({ type: "draw", startPoint, currX, currY, lineColor })
      );
    }
  }

  // Function to draw received data
  function drawLineFromData(data: {
    type: string;
    lineColor: string;
    startPoint: Point;
    currX: number;
    currY: number;
  }) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = data.lineColor;
    ctx.moveTo(data.startPoint.x, data.startPoint.y);
    ctx.lineTo(data.currX, data.currY);
    ctx.stroke();

    ctx.fillStyle = data.lineColor;
    ctx.beginPath();
    ctx.arc(data.startPoint.x, data.startPoint.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  const handleClear = () => {
    // Send clear command to the WebSocket server
    if (ws) {
      ws.send(JSON.stringify({ type: "clear" }));
    }
    clear(); // Clear local canvas
  };

  const handleLeaveRoom = () => {
    if (ws) {
      ws.close(); // Close the WebSocket connection
    }
    router.push("/"); // Redirect to the home page or another appropriate page
  };

  return (
    <div className="flex flex-col md:flex-row justify-center items-center min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 p-10">
      <div className="flex flex-col gap-5 p-6 bg-white rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-200 w-full max-w-xs">
        <h2 className="text-xl font-semibold text-center text-gray-700">
          Room ID
        </h2>
        <div className="flex justify-center mb-4">
          <span className="bg-purple-600 text-white text-lg font-bold py-2 px-4 rounded-lg shadow-md">
            {roomId}
          </span>
        </div>
        <ChromePicker color={color} onChange={(e) => setColor(e.hex)} />
        <Button
          variant="outline"
          className="w-full border-gray-300 hover:border-gray-500 transition duration-200"
          type="button"
          onClick={handleClear}
        >
          Clear Canvas
        </Button>
        <Button
          variant="outline"
          className="w-full border-red-300 hover:border-red-500 transition duration-200 mt-4"
          type="button"
          onClick={handleLeaveRoom}
        >
          Leave Room
        </Button>
      </div>

      <canvas
        onMouseDown={onMouseDown}
        ref={canvasRef}
        width={750}
        height={750}
        className="md:flex hidden bg-white border border-gray-300 rounded-md shadow-md transition-transform transform hover:shadow-xl duration-200 ml-8"
      />
    </div>
  );
};

export default Canvas;
