"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  Wand2,
  LayoutDashboard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/improve", label: "Improve", icon: Wand2 },
];

interface SidebarProps {
  userEmail: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out failed");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 shadow-md shadow-violet-500/20">
          <Sparkles className="size-4 text-white" />
        </div>
        <span className="font-semibold tracking-tight text-foreground">Magna AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/generate" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {label}
              {active && (
                <ChevronRight className="ml-auto size-3.5 text-primary/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
