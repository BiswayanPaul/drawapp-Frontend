import { auth } from "@/auth";
import RoomLauncher from "@/components/room-launcher";
import RecentRooms from "@/components/recent-rooms";
import { getRecentRooms } from "@/utils/rooms";
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
  const recentRooms = session?.user?.id ? await getRecentRooms(session.user.id) : [];

  return (
    <div className="bg-dots flex flex-1 flex-col justify-center">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-x-12 lg:gap-y-10">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="mb-3 text-sm font-medium text-primary">
            {firstName ? `Hey ${firstName} 👋` : "Welcome 👋"}
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Sketch together,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-fuchsia-400">
              in real time.
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
            Start a fresh canvas and invite anyone with a short room code. No
            setup, no installs.
          </p>
        </div>
        {/* On phones the launcher sits right under the headline; on desktop it gets its own column. */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <RoomLauncher />
        </div>
        <ul className="grid gap-5 sm:grid-cols-3 lg:col-start-1 lg:row-start-2 lg:self-start">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 sm:block">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground sm:mb-2">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <RecentRooms rooms={recentRooms} />
    </div>
  );
}
