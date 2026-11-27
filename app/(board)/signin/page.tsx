import { AuthBoard } from "@/components/auth/auth-board";
import { oauthErrorMessage } from "@/components/auth/form-error";

const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string | string[]; next?: string | string[] };
}) {
  return (
    <AuthBoard
      mode="signin"
      next={first(searchParams.next)}
      error={oauthErrorMessage(searchParams.error)}
    />
  );
}
