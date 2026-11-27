import { AuthBoard } from "@/components/auth/auth-board";

const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  return <AuthBoard mode="register" next={first(searchParams.next)} />;
}
