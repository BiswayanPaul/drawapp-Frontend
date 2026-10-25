import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Error codes next-auth appends to the sign-in page URL (pages.error).
const OAUTH_ERRORS: Record<string, string> = {
  AccessDenied: "Google sign-in was cancelled or couldn't be completed.",
  Configuration:
    "Sign-in is misconfigured on the server. Please try again later.",
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with your password instead.",
  CredentialsSignin: "Invalid email or password",
};

export function oauthErrorMessage(code?: string | string[]) {
  if (!code) return undefined;
  const key = Array.isArray(code) ? code[0] : code;
  return OAUTH_ERRORS[key] ?? "Something went wrong while signing you in.";
}
