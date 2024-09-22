"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Popup from "reactjs-popup";

export default function Home() {
  const [inputRoomId, setInputRoomId] = useState<string>("");
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const session = useSession();
  const router = useRouter();

  if (session.status === "unauthenticated") {
    router.push("/signin");
  }

  const handleCreateRoom = () => {
    const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();
    router.push(`/rooms/${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.length === 4) {
      router.push(`/rooms/${inputRoomId}`);
    } else {
      alert("Please enter a valid 4-digit Room ID.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-200 to-green-200 p-5">
      <div className="flex flex-col gap-8 w-full max-w-md">
        {/* Create Room Button */}
        <div className="bg-white rounded-lg shadow-lg p-6 transition-transform transform hover:scale-105">
          <h2 className="text-2xl font-bold text-center mb-4">Create a Room</h2>
          <Button
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition"
          >
            Create Room
          </Button>
        </div>

        {/* Join Room Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 transition-transform transform hover:scale-105">
          <h2 className="text-2xl font-bold text-center mb-4">Join a Room</h2>
          <Button
            onClick={() => setModalOpen(true)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition"
          >
            Join Room
          </Button>

          {/* Modal for Join Room */}
          <Popup
            open={isModalOpen}
            onClose={() => setModalOpen(false)}
            className="flex justify-center items-center fixed inset-0 backdrop-blur-sm"
            overlayStyle={{ background: "rgba(0, 0, 0, 0.5)" }}
          >
            <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Enter Room ID</h3>
              <form onSubmit={handleJoinRoom} className="flex flex-col">
                <Input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Enter 4-digit Room ID"
                  maxLength={4}
                  required
                  className="border-2 border-gray-300 rounded-lg p-2 mb-4 focus:border-green-500 focus:ring focus:ring-green-200 transition"
                />
                <Button
                  type="submit"
                  className="w-full bg-green-500 text-white hover:bg-green-600 transition"
                >
                  Join Room
                </Button>
                <Button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="mt-4 w-full bg-red-500 text-white hover:bg-red-600 transition"
                >
                  Cancel
                </Button>
              </form>
            </div>
          </Popup>
        </div>
      </div>
    </div>
  );
}
