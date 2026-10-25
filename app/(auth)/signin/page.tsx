import { SignInForm } from "@/components/auth/signin-form";
import { oauthErrorMessage } from "@/components/auth/form-error";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string | string[] };
}) {
  return <SignInForm initialError={oauthErrorMessage(searchParams.error)} />;
}
