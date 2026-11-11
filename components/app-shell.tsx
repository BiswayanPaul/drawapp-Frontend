"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/auth/auth-provider";

function LoadingScreen() {
  return <div className="min-h-screen bg-background" aria-label="Loading" />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, router, user]);

  if (loading || !user) return <LoadingScreen />;
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, router, user]);

  if (loading || user) return <LoadingScreen />;
  return <>{children}</>;
}
