import Whiteboard from "@/components/room/whiteboard";

// The app opens straight onto the board. Anyone can draw here, signed in or not;
// it's kept in this browser. Everything else (rooms, sign-in) pops up over it.
export default function BoardPage() {
  return <Whiteboard />;
}
