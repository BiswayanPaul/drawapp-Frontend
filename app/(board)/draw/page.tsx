import { redirect } from "next/navigation";

// Old link to the solo board, which is now the home page.
export default function DrawPage() {
  redirect("/");
}
