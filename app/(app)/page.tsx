import { auth } from "@/auth";
import RoomLauncher from "@/components/room-launcher";
import { Palette, Share2, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-time",
    text: "Every stroke shows up for everyone in the room instantly.",
  },
  {
    icon: Share2,
    title: "Share a link",
    text: "Send the room code or link — friends join in one click.",
  },
  {
    icon: Palette,
    title: "Draw anywhere",
    text: "Works with mouse, trackpad, touch and stylus.",
  },
];

export default async function Home() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="bg-dots flex flex-1 items-center bg-slate-50">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-3 text-sm font-medium text-primary">
            {firstName ? `Hey ${firstName} 👋` : "Welcome 👋"}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Sketch together,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
              in real time.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-600">
            Start a fresh canvas and invite anyone with a short room code. No
            setup, no installs.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Icon className="size-5" />
                </span>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <RoomLauncher />
      </div>
    </div>
  );
}
