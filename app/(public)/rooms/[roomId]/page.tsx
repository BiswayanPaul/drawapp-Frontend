// app/(public)/rooms/[roomId]/page.tsx

import Canvas from "@/components/canvas";
import { FC } from "react";

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

const RoomPage: FC<RoomPageProps> = ({ params }) => {
  const { roomId } = params;

  return (
    <div>
      <Canvas roomId={roomId} />
    </div>
  );
};

export default RoomPage;
