"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Globe, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/auth/form-error";
import { updateRoomPassword } from "@/app/actions/roomactions";
import { cn } from "@/lib/utils";

export function PrivacyButton({
  roomId,
  isOwner,
  isPrivate,
}: {
  roomId: string;
  isOwner: boolean;
  isPrivate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = isPrivate ? Lock : Globe;
  const label = isPrivate ? "Private" : "Public";

  const className =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm transition sm:px-3";

  if (!isOwner) {
    // Visitors only see the state; there's nothing for them to change.
    return isPrivate ? (
      <span className={className} title="Private room">
        <Lock className="size-4" />
        <span className="hidden md:inline">{label}</span>
      </span>
    ) : null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Room privacy"
        className={cn(className, "hover:bg-secondary hover:text-foreground")}
      >
        <Icon className="size-4" />
        <span className="hidden md:inline">{label}</span>
      </button>
      {open && (
        <PrivacyDialog roomId={roomId} isPrivate={isPrivate} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function PrivacyDialog({
  roomId,
  isPrivate,
  onClose,
}: {
  roomId: string;
  isPrivate: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<"save" | "public" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (action: "save" | "public") => {
    setPending(action);
    setError(undefined);
    const result = await updateRoomPassword(roomId, action === "public" ? null : password);
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl"
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 id="privacy-title" className="text-lg font-semibold">
            {isPrivate ? "Private room" : "Make this room private"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          {isPrivate
            ? "People need the password to join. Changing it removes everyone else until they enter the new one."
            : "Only people who know the password will be able to join. Everyone else in the room right now will need to enter it."}
        </p>

        <FormError message={error} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run("save");
          }}
          className="space-y-3"
        >
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isPrivate ? "New password" : "Room password"}
            autoComplete="new-password"
            className="h-11"
          />
          <Button type="submit" disabled={!!pending || !password} className="h-11 w-full">
            {pending === "save" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Lock className="mr-2 size-4" />
            )}
            {isPrivate ? "Change password" : "Make private"}
          </Button>
        </form>

        {isPrivate && (
          <Button
            variant="outline"
            disabled={!!pending}
            onClick={() => run("public")}
            className="mt-3 h-11 w-full"
          >
            {pending === "public" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Globe className="mr-2 size-4" />
            )}
            Make public
          </Button>
        )}
      </div>
    </div>
  );
}
