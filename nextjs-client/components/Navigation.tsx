"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="tab-navigation">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`tab-button ${pathname === item.href ? "active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
