"use client";

import { useState } from "react";
import { Globe, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassDialog } from "@/components/ui/glass-dialog";
import { FormError } from "@/components/auth/form-error";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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
    "glass inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-sm text-muted-foreground transition sm:px-3";

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
        className={cn(className, "hover:bg-white/80 hover:text-foreground dark:hover:bg-white/10")}
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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<"save" | "public" | null>(null);

  const run = async (action: "save" | "public") => {
    setPending(action);
    setError(undefined);
    try {
      await api.updateRoomPrivacy(roomId, action === "public" ? null : password);
      onClose();
      // The API mints a fresh room token after an access-version change.
      window.location.reload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't update room privacy.");
      setPending(null);
    }
  };

  return (
    <GlassDialog onClose={onClose} labelledBy="privacy-title">
      <h2 id="privacy-title" className="mb-1 pr-6 text-lg font-semibold">
        {isPrivate ? "Private room" : "Make this room private"}
      </h2>
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
          className="h-11 bg-white/60 dark:bg-white/5"
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
          className="mt-3 h-11 w-full bg-white/60 dark:bg-white/5"
        >
          {pending === "public" ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Globe className="mr-2 size-4" />
          )}
          Make public
        </Button>
      )}
    </GlassDialog>
  );
}
