"use client";

import { useRouter } from "next/navigation";
import styles from "./console-nav.module.css";

export function LogoutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className={styles.logoutButton} onClick={() => void signOut()} type="button">
      Log out
    </button>
  );
}
