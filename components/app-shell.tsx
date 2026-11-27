"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/auth/auth-provider";
import { currentNext } from "@/lib/redirect";

function LoadingScreen() {
  return <div className="min-h-screen bg-background" aria-label="Loading" />;
}

// Public pages: guests see everything; actions that need an account prompt to sign in.
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} loading={loading} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace(currentNext());
  }, [loading, router, user]);

  if (loading || user) return <LoadingScreen />;
  return <>{children}</>;
}
