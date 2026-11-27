import type { Metadata } from "next";
import Whiteboard from "@/components/room/whiteboard";

export const metadata: Metadata = {
  title: "Blank board — DrawApp",
};

// Anyone can draw here, signed in or not; the board is kept in this browser.
export default function DrawPage() {
  return <Whiteboard />;
}
