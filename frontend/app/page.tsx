import { redirect } from "next/navigation";

// Middleware handles auth-based redirects; this catches any direct visits to "/"
export default function RootPage() {
  redirect("/login");
}
