import { useState } from "react";
import Canvas from "@/components/canvas"; // Assuming Canvas is your drawing component

const Room = () => {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoinRoom = () => {
    if (roomId) {
      setJoined(true);
    }
  };

  return (
    <div>
      {!joined ? (
        <div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      ) : (
        <Canvas roomId={roomId} />
      )}
    </div>
  );
};

export default Room;
