import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/components/Navbar";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={session.user} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
