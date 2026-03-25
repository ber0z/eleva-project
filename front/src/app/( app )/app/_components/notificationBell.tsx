"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    api
      .get("/user/notifications/unread-count")
      .then((res) => setCount(res.data.unreadCount ?? 0))
      .catch(() => {});
  }, [pathname]);

  return (
    <Link
      href="/app/notifications"
      aria-label="Notificações"
      className="
        relative inline-flex items-center justify-center h-9 w-9 rounded-md
        text-muted-foreground hover:text-foreground hover:bg-muted
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
      "
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
