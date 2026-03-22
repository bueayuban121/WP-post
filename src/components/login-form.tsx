"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login-form.module.css";

export function LoginForm({ requiresSetup }: { requiresSetup: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    requiresSetup
      ? "No admin account exists yet. The first login will create the admin account."
      : "Sign in to manage content, workflow status, and WordPress publishing."
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sign in.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.loginShell}>
      <div className={styles.ambient} />
      <article className={styles.loginCard}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>Auto Post Content</span>
          <h1>Sign in to the content ops console</h1>
          <p>{message}</p>
        </div>

        <div className={styles.form}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              value={password}
            />
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.primaryButton} disabled={pending} onClick={() => void submit()} type="button">
            {pending ? "Signing in..." : requiresSetup ? "Create admin and sign in" : "Sign in"}
          </button>
        </div>
      </article>
    </section>
  );
}
