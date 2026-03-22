"use client";

import { useState } from "react";
import styles from "./console-pages.module.css";
import type { AppUserSession } from "@/lib/auth";

const storageKey = "auto-post-content-settings";

type SavedSettings = {
  tone: string;
  restrictedWords: string;
  articleLength: string;
  wordpressUrl: string;
  publishStatus: "draft" | "publish";
};

const defaultSettings: SavedSettings = {
  tone: "Calm expert",
  restrictedWords: "ดีที่สุด, การันตี, รักษาหาย",
  articleLength: "1800",
  wordpressUrl: "",
  publishStatus: "draft"
};

export function SettingsPage({
  currentUser,
  managedUsers
}: {
  currentUser: AppUserSession;
  managedUsers: AppUserSession[];
}) {
  const [settings, setSettings] = useState<SavedSettings>(() => {
    if (typeof window === "undefined") {
      return defaultSettings;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultSettings;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SavedSettings>;
      return { ...defaultSettings, ...parsed };
    } catch {
      window.localStorage.removeItem(storageKey);
      return defaultSettings;
    }
  });
  const [saved, setSaved] = useState(false);
  const [accounts, setAccounts] = useState(managedUsers);
  const [accountStatus, setAccountStatus] = useState("");
  const [accountPending, setAccountPending] = useState(false);
  const [accountDrafts, setAccountDrafts] = useState<Record<string, { status: "active" | "expired" | "suspended"; contractEnd: string }>>(
    () =>
      Object.fromEntries(
        managedUsers.map((user) => [
          user.id,
          {
            status: user.status,
            contractEnd: user.contractEnd ? user.contractEnd.slice(0, 10) : ""
          }
        ])
      )
  );
  const [newAccount, setNewAccount] = useState({
    email: "",
    name: "",
    password: "",
    clientName: "",
    contractStart: "",
    contractEnd: "",
    status: "active" as "active" | "expired" | "suspended"
  });

  function update<K extends keyof SavedSettings>(key: K, value: SavedSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
  }

  async function createAccount() {
    setAccountPending(true);
    setAccountStatus("");

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount)
      });
      const data = (await response.json()) as { error?: string; user?: AppUserSession };

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Unable to create account.");
      }

      setAccounts((current) => [data.user!, ...current]);
      setAccountDrafts((current) => ({
        ...current,
        [data.user!.id]: {
          status: data.user!.status,
          contractEnd: data.user!.contractEnd ? data.user!.contractEnd.slice(0, 10) : ""
        }
      }));
      setNewAccount({
        email: "",
        name: "",
        password: "",
        clientName: "",
        contractStart: "",
        contractEnd: "",
        status: "active"
      });
      setAccountStatus("Client account created.");
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setAccountPending(false);
    }
  }

  async function updateAccount(userId: string, payload: { status?: "active" | "expired" | "suspended"; contractEnd?: string; password?: string; }) {
    setAccountPending(true);
    setAccountStatus("");

    try {
      const response = await fetch(`/api/accounts/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; user?: AppUserSession };
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Unable to update account.");
      }

      setAccounts((current) => current.map((item) => (item.id === data.user!.id ? data.user! : item)));
      setAccountDrafts((current) => ({
        ...current,
        [data.user!.id]: {
          status: data.user!.status,
          contractEnd: data.user!.contractEnd ? data.user!.contractEnd.slice(0, 10) : ""
        }
      }));
      setAccountStatus("Account updated.");
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Unable to update account.");
    } finally {
      setAccountPending(false);
    }
  }

  function updateAccountDraft(userId: string, field: "status" | "contractEnd", value: string) {
    setAccountDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? { status: "active", contractEnd: "" }),
        [field]: value
      }
    }));
  }

  return (
    <section className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Content Defaults</span>
            <h2>Default generation settings</h2>
            <p>ใช้ตั้งค่าพื้นฐานสำหรับโทนการเขียน คำต้องห้าม และความยาวบทความก่อนเริ่มสร้างงานใหม่</p>
          </div>
          <span className={styles.badge}>Editable</span>
        </div>

        <div className={styles.form}>
          <label>
            Tone
            <small>โทนหลักของบทความ เช่น calm expert, premium, direct</small>
            <input value={settings.tone} onChange={(event) => update("tone", event.target.value)} />
          </label>

          <label>
            Restricted words
            <small>คำที่ไม่ต้องการให้ระบบใช้ในบทความ คั่นด้วย comma</small>
            <textarea
              rows={4}
              value={settings.restrictedWords}
              onChange={(event) => update("restrictedWords", event.target.value)}
            />
          </label>

          <label>
            Article length
            <small>ความยาวเป้าหมายของบทความ เช่น 1800 หรือ 2200 คำ</small>
            <input value={settings.articleLength} onChange={(event) => update("articleLength", event.target.value)} />
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={saveSettings} type="button">
            Save settings
          </button>
          {saved ? <span className={styles.success}>Saved to this browser</span> : null}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Publishing</span>
            <h2>WordPress defaults</h2>
            <p>ใช้เป็นค่าอ้างอิงก่อนส่งงานขึ้น WordPress ผ่าน n8n poller</p>
          </div>
          <span className={styles.badge}>Local preset</span>
        </div>

        <div className={styles.form}>
          <label>
            WordPress URL
            <small>โดเมนปลายทางของเว็บไซต์ เช่น https://example.com</small>
            <input value={settings.wordpressUrl} onChange={(event) => update("wordpressUrl", event.target.value)} />
          </label>

          <label>
            Publish status
            <small>กำหนดค่าเริ่มต้นของสถานะโพสต์ก่อนส่งงานออก</small>
            <select
              value={settings.publishStatus}
              onChange={(event) => update("publishStatus", event.target.value as SavedSettings["publishStatus"])}
            >
              <option value="draft">draft</option>
              <option value="publish">publish</option>
            </select>
          </label>
        </div>

        <div className={styles.helperList}>
          <div className={styles.settingCard}>
            <strong>What this page controls</strong>
            <p className={styles.muted}>
              หน้านี้เก็บค่าตั้งต้นของเครื่องที่ใช้งานอยู่ เพื่อให้ทีมเริ่มงานได้เร็วขึ้นก่อนเชื่อมค่าเหล่านี้เข้าฐานข้อมูลส่วนกลาง
            </p>
          </div>
          <div className={styles.settingCard}>
            <strong>Next recommended step</strong>
            <p className={styles.muted}>ถ้าต้องการให้ค่าเหล่านี้มีผลกับทุกคนในทีม รอบถัดไปควรย้ายไปเก็บใน database และ project-level settings</p>
          </div>
        </div>
      </section>

      {currentUser.role === "admin" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>Access Control</span>
              <h2>Client login and contract expiry</h2>
              <p>Create client accounts, set contract dates, and suspend access when needed.</p>
            </div>
            <span className={styles.badge}>Admin only</span>
          </div>

          <div className={styles.form}>
            <label>
              Client name
              <small>Name used to scope projects and jobs for this account.</small>
              <input
                value={newAccount.clientName}
                onChange={(event) => setNewAccount((current) => ({ ...current, clientName: event.target.value }))}
              />
            </label>
            <label>
              Contact name
              <small>Optional display name shown in the access list.</small>
              <input
                value={newAccount.name}
                onChange={(event) => setNewAccount((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Login email
              <small>Email used to enter the program.</small>
              <input
                value={newAccount.email}
                onChange={(event) => setNewAccount((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Password
              <small>Temporary password for the client account.</small>
              <input
                type="password"
                value={newAccount.password}
                onChange={(event) => setNewAccount((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <label>
              Contract start
              <small>Optional start date for the agreement.</small>
              <input
                type="date"
                value={newAccount.contractStart}
                onChange={(event) => setNewAccount((current) => ({ ...current, contractStart: event.target.value }))}
              />
            </label>
            <label>
              Contract end
              <small>After this date the client account is treated as expired.</small>
              <input
                type="date"
                value={newAccount.contractEnd}
                onChange={(event) => setNewAccount((current) => ({ ...current, contractEnd: event.target.value }))}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={accountPending} onClick={() => void createAccount()} type="button">
              {accountPending ? "Saving account..." : "Create client account"}
            </button>
            {accountStatus ? <span className={styles.success}>{accountStatus}</span> : null}
          </div>

          <div className={styles.stack}>
            {accounts.map((account) => (
              <article key={account.id} className={styles.projectCard}>
                <strong>{account.clientName ?? account.name}</strong>
                <p className={styles.muted}>
                  {account.email} · {account.role}
                </p>
                <div className={styles.projectMeta}>
                  <span className={styles.pill}>{account.status}</span>
                  <span className={styles.pill}>
                    {account.contractEnd ? `Ends ${new Date(account.contractEnd).toLocaleDateString("en-GB")}` : "No expiry"}
                  </span>
                </div>
                {account.role === "client" ? (
                  <>
                    <div className={styles.form}>
                      <label>
                        Access status
                        <select
                          value={accountDrafts[account.id]?.status ?? account.status}
                          onChange={(event) => updateAccountDraft(account.id, "status", event.target.value)}
                        >
                          <option value="active">active</option>
                          <option value="expired">expired</option>
                          <option value="suspended">suspended</option>
                        </select>
                      </label>
                      <label>
                        Contract end
                        <input
                          type="date"
                          value={accountDrafts[account.id]?.contractEnd ?? ""}
                          onChange={(event) => updateAccountDraft(account.id, "contractEnd", event.target.value)}
                        />
                      </label>
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.linkButton}
                        disabled={accountPending}
                        onClick={() =>
                          void updateAccount(account.id, {
                            status: accountDrafts[account.id]?.status ?? account.status,
                            contractEnd: accountDrafts[account.id]?.contractEnd ?? ""
                          })
                        }
                        type="button"
                      >
                        Save access
                      </button>
                    </div>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
