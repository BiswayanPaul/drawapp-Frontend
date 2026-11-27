import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const next = Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next;
  return <RegisterForm next={next} />;
}
