"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./console-nav.module.css";

const navItems = [
  { href: "/projects", label: "Projects" },
  { href: "/", label: "Keywords" },
  { href: "/queue", label: "Queue" },
  { href: "/articles", label: "Articles" },
  { href: "/settings", label: "Settings" }
];

export function ConsoleNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.topNav}>
      <div className={styles.navBrand}>
        <span className={styles.kicker}>Auto Post Content</span>
        <strong>Keyword to research-backed article workflow</strong>
      </div>
      <div className={styles.navLinks}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            className={pathname === item.href ? styles.navActive : ""}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
