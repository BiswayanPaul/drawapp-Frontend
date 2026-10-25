import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import paintBrush from "@/app/fonts/paintbrush.png";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <Image src={paintBrush} alt="" width={36} height={36} />
          DrawApp
        </div>
        <svg
          aria-hidden
          viewBox="0 0 400 200"
          className="absolute inset-x-0 top-1/3 w-full opacity-30"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        >
          <path d="M10 150 C 80 20, 140 20, 180 110 S 290 190, 390 40" />
          <path d="M30 180 C 120 120, 200 170, 260 120" strokeWidth="3" />
        </svg>
        <div className="relative space-y-3">
          <h2 className="text-4xl font-bold leading-tight">
            Sketch together,
            <br />
            in real time.
          </h2>
          <p className="max-w-sm text-white/80">
            Spin up a room, share the code and watch every stroke appear on
            everyone&apos;s canvas instantly.
          </p>
        </div>
      </aside>
      <section className="relative flex flex-col bg-background px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="flex items-center gap-2.5 font-semibold lg:hidden">
            <Image src={paintBrush} alt="" width={28} height={28} />
            DrawApp
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </div>
  );
}
