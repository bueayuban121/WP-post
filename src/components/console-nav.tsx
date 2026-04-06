"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./console-nav.module.css";
import { LogoutButton } from "@/components/logout-button";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/projects", label: "Projects" },
  { href: "/keywords", label: "Keywords" },
  { href: "/queue", label: "Queue" },
  { href: "/articles", label: "Drafts" },
  { href: "/facebook", label: "Social" },
  { href: "/published", label: "Live" },
  { href: "/settings", label: "Setup" }
];

export function ConsoleNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.topNav}>
      <div className={styles.navBrand}>
        <span className={styles.kicker}>Auto Post Studio</span>
        <strong>Editorial engine</strong>
      </div>
      <div className={styles.navLinks}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/keywords" && pathname === "/");

          return (
          <Link
            key={item.href}
            className={isActive ? styles.navActive : ""}
            href={item.href}
          >
            {item.label}
          </Link>
          );
        })}
      </div>
      <div className={styles.navUtilities}>
        <LogoutButton />
      </div>
    </nav>
  );
}
