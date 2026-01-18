"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bot, CreditCard, Settings, LayoutTemplate } from "lucide-react";

const navItems = [
  {
    title: "Bots",
    href: "/bots",
    icon: Bot,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: LayoutTemplate,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-6 text-sm">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 transition-colors hover:text-foreground/80",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "text-foreground"
                : "text-foreground/60"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
