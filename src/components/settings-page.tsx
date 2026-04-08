"use client";

import { useEffect, useState } from "react";
import styles from "./console-pages.module.css";
import type { AppUserSession } from "@/lib/auth";

const storageKey = "auto-post-content-settings";

type SavedSettings = {
  tone: string;
  restrictedWords: string;
  articleLength: string;
};

type ManagedAccountDraft = {
  status: "active" | "expired" | "suspended";
  contractEnd: string;
  clientArticlePrompt: string;
  clientExpertisePrompt: string;
  clientBrandVoicePrompt: string;
  clientResearchProvider: "tavily" | "dataforseo";
  clientPlan: "normal" | "premium" | "pro";
  clientWordpressUrl: string;
  clientWordpressUsername: string;
  clientWordpressAppPassword: string;
  clientWordpressPublishStatus: "draft" | "publish";
};

type NewAccountState = {
  email: string;
  name: string;
  password: string;
  clientName: string;
  articlePrompt: string;
  expertisePrompt: string;
  brandVoicePrompt: string;
  researchProvider: "tavily" | "dataforseo";
  clientPlan: "normal" | "premium" | "pro";
  wordpressUrl: string;
  wordpressUsername: string;
  wordpressAppPassword: string;
  wordpressPublishStatus: "draft" | "publish";
  contractStart: string;
  contractEnd: string;
  status: "active" | "expired" | "suspended";
};

const defaultSettings: SavedSettings = {
  tone: "Calm expert",
  restrictedWords: "ดีที่สุด, การันตี, รักษาหาย",
  articleLength: "1800"
};

function createAccountDraft(user: AppUserSession): ManagedAccountDraft {
  return {
    status: user.status,
    contractEnd: user.contractEnd ? user.contractEnd.slice(0, 10) : "",
    clientArticlePrompt: user.clientArticlePrompt ?? "",
    clientExpertisePrompt: user.clientExpertisePrompt ?? "",
    clientBrandVoicePrompt: user.clientBrandVoicePrompt ?? "",
    clientResearchProvider: user.clientResearchProvider === "dataforseo" ? "dataforseo" : "tavily",
    clientPlan: user.clientPlan === "premium" || user.clientPlan === "pro" ? user.clientPlan : "normal",
    clientWordpressUrl: user.clientWordpressUrl ?? "",
    clientWordpressUsername: user.clientWordpressUsername ?? "",
    clientWordpressAppPassword: user.clientWordpressAppPassword ?? "",
    clientWordpressPublishStatus:
      user.clientWordpressPublishStatus === "publish" ? "publish" : "draft"
  };
}

const emptyNewAccount: NewAccountState = {
  email: "",
  name: "",
  password: "",
  clientName: "",
  articlePrompt: "",
  expertisePrompt: "",
  brandVoicePrompt: "",
  researchProvider: "tavily",
  clientPlan: "normal",
  wordpressUrl: "",
  wordpressUsername: "",
  wordpressAppPassword: "",
  wordpressPublishStatus: "draft",
  contractStart: "",
  contractEnd: "",
  status: "active"
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
  const [systemArticlePrompt, setSystemArticlePrompt] = useState("");
  const [defaultResearchProvider, setDefaultResearchProvider] = useState<"tavily" | "dataforseo">("tavily");
  const [promptSaved, setPromptSaved] = useState("");
  const [accountDrafts, setAccountDrafts] = useState<Record<string, ManagedAccountDraft>>(() =>
    Object.fromEntries(managedUsers.map((user) => [user.id, createAccountDraft(user)]))
  );
  const [newAccount, setNewAccount] = useState<NewAccountState>(emptyNewAccount);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  function update<K extends keyof SavedSettings>(key: K, value: SavedSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
  }

  useEffect(() => {
    if (currentUser.role !== "admin") {
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/settings/prompts", { cache: "no-store" });
        const data = (await response.json()) as {
          error?: string;
          systemArticlePrompt?: string;
          defaultResearchProvider?: "tavily" | "dataforseo";
        };
        if (response.ok) {
          setSystemArticlePrompt(data.systemArticlePrompt ?? "");
          setDefaultResearchProvider(data.defaultResearchProvider === "dataforseo" ? "dataforseo" : "tavily");
        }
      } catch {
        // Keep the field editable locally when the request fails.
      }
    })();
  }, [currentUser.role]);

  async function saveSystemPrompt() {
    setAccountPending(true);
    setPromptSaved("");

    try {
      const response = await fetch("/api/settings/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemArticlePrompt,
          defaultResearchProvider
        })
      });
      const data = (await response.json()) as {
        error?: string;
        systemArticlePrompt?: string;
        defaultResearchProvider?: "tavily" | "dataforseo";
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save system prompt.");
      }

      setSystemArticlePrompt(data.systemArticlePrompt ?? "");
      setDefaultResearchProvider(data.defaultResearchProvider === "dataforseo" ? "dataforseo" : "tavily");
      setPromptSaved("System AI settings saved.");
    } catch (error) {
      setPromptSaved(error instanceof Error ? error.message : "Unable to save system prompt.");
    } finally {
      setAccountPending(false);
    }
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
        [data.user!.id]: createAccountDraft(data.user!)
      }));
      setNewAccount({ ...emptyNewAccount });
      setAccountStatus("Client account created.");
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setAccountPending(false);
    }
  }

  async function updateAccount(
    userId: string,
    payload: {
      status?: "active" | "expired" | "suspended";
      contractEnd?: string;
      password?: string;
      clientArticlePrompt?: string;
      clientExpertisePrompt?: string;
      clientBrandVoicePrompt?: string;
      clientResearchProvider?: "tavily" | "dataforseo";
      clientPlan?: "normal" | "premium" | "pro";
      clientWordpressUrl?: string;
      clientWordpressUsername?: string;
      clientWordpressAppPassword?: string;
      clientWordpressPublishStatus?: "draft" | "publish";
    }
  ) {
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
        [data.user!.id]: createAccountDraft(data.user!)
      }));
      setAccountStatus("Account updated.");
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Unable to update account.");
    } finally {
      setAccountPending(false);
    }
  }

  function updateAccountDraft<K extends keyof ManagedAccountDraft>(
    userId: string,
    field: K,
    value: ManagedAccountDraft[K]
  ) {
    setAccountDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? createAccountDraft({
          id: userId,
          email: "",
          name: "",
          role: "client",
          status: "active",
          clientId: null,
          clientName: null,
          contractStart: null,
          contractEnd: null,
          clientArticlePrompt: null,
          clientExpertisePrompt: null,
          clientBrandVoicePrompt: null,
          clientResearchProvider: null,
          clientPlan: null,
          clientWordpressUrl: null,
          clientWordpressUsername: null,
          clientWordpressAppPassword: null,
          clientWordpressPublishStatus: null
        })),
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
            <small>โทนหลักของบทความ เช่น calm expert, premium editorial หรือ direct conversion</small>
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

      {currentUser.role === "admin" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>AI Writing Control</span>
              <h2>System article prompt</h2>
              <p>เห็นและแก้ได้เฉพาะ admin หรือ owner ใช้เป็นกฎกลางก่อนนำ prompt เฉพาะบริษัทมาซ้อนเพิ่ม</p>
            </div>
            <span className={styles.badge}>Admin only</span>
          </div>

          <div className={styles.form}>
            <label>
              Global article prompt
              <small>กำหนดกฎกลางของระบบ เช่น วิธีเขียน ความเป็นธรรมชาติ ความเข้ม SEO และข้อห้ามหลัก</small>
              <textarea
                rows={8}
                value={systemArticlePrompt}
                onChange={(event) => setSystemArticlePrompt(event.target.value)}
              />
            </label>

            <label>
              Default research provider
              <small>กำหนด provider กลางของระบบ ลูกค้ารายไหนไม่ override จะใช้ค่านี้</small>
              <select
                value={defaultResearchProvider}
                onChange={(event) =>
                  setDefaultResearchProvider(event.target.value as "tavily" | "dataforseo")
                }
              >
                <option value="tavily">tavily</option>
                <option value="dataforseo">dataforseo</option>
              </select>
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={accountPending} onClick={() => void saveSystemPrompt()} type="button">
              {accountPending ? "Saving prompt..." : "Save system prompt"}
            </button>
            {promptSaved ? <span className={styles.success}>{promptSaved}</span> : null}
          </div>
        </section>
      ) : null}

      {currentUser.role === "admin" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>Access Control</span>
              <h2>Client accounts and company WordPress settings</h2>
              <p>สร้างลูกค้าใหม่ พร้อมเก็บ prompt เฉพาะธุรกิจและข้อมูล WordPress ของแต่ละบริษัทไว้ใต้ account นั้นเลย</p>
            </div>
            <span className={styles.badge}>Admin only</span>
          </div>

          <div className={styles.form}>
            <label>
              Client name
              <small>ชื่อบริษัทหรือแบรนด์ที่ใช้ scope งาน โปรเจกต์ และ publish ปลายทาง</small>
              <input
                value={newAccount.clientName}
                onChange={(event) => setNewAccount((current) => ({ ...current, clientName: event.target.value }))}
              />
            </label>

            <label>
              Contact name
              <small>ชื่อผู้ใช้งานหรือชื่อผู้ประสานงานฝั่งลูกค้า</small>
              <input
                value={newAccount.name}
                onChange={(event) => setNewAccount((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label>
              Login email
              <small>Email ที่ลูกค้าใช้เข้าสู่ระบบ</small>
              <input
                value={newAccount.email}
                onChange={(event) => setNewAccount((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              Password
              <small>รหัสผ่านชั่วคราวสำหรับ account ใหม่นี้</small>
              <input
                type="password"
                value={newAccount.password}
                onChange={(event) => setNewAccount((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            <label>
              Research provider
              <small>เลือก provider สำหรับงานแตก keyword และรีเสิร์ชของลูกค้ารายนี้</small>
              <select
                value={newAccount.researchProvider}
                onChange={(event) =>
                  setNewAccount((current) => ({
                    ...current,
                    researchProvider: event.target.value as "tavily" | "dataforseo"
                  }))
                }
              >
                <option value="tavily">tavily</option>
                <option value="dataforseo">dataforseo</option>
              </select>
            </label>

            <label>
              Plan
              <small>กำหนดระดับแพ็กของลูกค้ารายนี้เพื่อใช้คุม feature และ workflow ในรอบถัดไป</small>
              <select
                value={newAccount.clientPlan}
                onChange={(event) =>
                  setNewAccount((current) => ({
                    ...current,
                    clientPlan: event.target.value as "normal" | "premium" | "pro"
                  }))
                }
              >
                <option value="normal">normal</option>
                <option value="premium">premium</option>
                <option value="pro">pro</option>
              </select>
            </label>

            <label>
              WordPress URL
              <small>โดเมนปลายทางของลูกค้ารายนี้ เช่น https://example.com</small>
              <input
                value={newAccount.wordpressUrl}
                onChange={(event) => setNewAccount((current) => ({ ...current, wordpressUrl: event.target.value }))}
              />
            </label>

            <label>
              WordPress username
              <small>ชื่อผู้ใช้ WordPress สำหรับ publish ของลูกค้ารายนี้</small>
              <input
                value={newAccount.wordpressUsername}
                onChange={(event) =>
                  setNewAccount((current) => ({ ...current, wordpressUsername: event.target.value }))
                }
              />
            </label>

            <label>
              WordPress app password
              <small>App password ของ WordPress สำหรับ publish ของลูกค้ารายนี้</small>
              <input
                type="password"
                value={newAccount.wordpressAppPassword}
                onChange={(event) =>
                  setNewAccount((current) => ({ ...current, wordpressAppPassword: event.target.value }))
                }
              />
            </label>

            <label>
              Default publish status
              <small>สถานะเริ่มต้นเมื่อส่งโพสต์ขึ้น WordPress ของลูกค้ารายนี้</small>
              <select
                value={newAccount.wordpressPublishStatus}
                onChange={(event) =>
                  setNewAccount((current) => ({
                    ...current,
                    wordpressPublishStatus: event.target.value as "draft" | "publish"
                  }))
                }
              >
                <option value="draft">draft</option>
                <option value="publish">publish</option>
              </select>
            </label>

            <label>
              Company article prompt
              <small>Prompt เฉพาะบริษัทสำหรับสไตล์การเขียนบทความของลูกค้ารายนี้</small>
              <textarea
                rows={5}
                value={newAccount.articlePrompt}
                onChange={(event) => setNewAccount((current) => ({ ...current, articlePrompt: event.target.value }))}
              />
            </label>

            <label>
              Company expertise prompt
              <small>กำหนด domain knowledge หรือความเชี่ยวชาญเฉพาะธุรกิจของบริษัทนี้</small>
              <textarea
                rows={4}
                value={newAccount.expertisePrompt}
                onChange={(event) => setNewAccount((current) => ({ ...current, expertisePrompt: event.target.value }))}
              />
            </label>

            <label>
              Brand voice prompt
              <small>กำหนดโทนแบรนด์ น้ำเสียง และลักษณะการสื่อสารของบริษัทนี้</small>
              <textarea
                rows={4}
                value={newAccount.brandVoicePrompt}
                onChange={(event) => setNewAccount((current) => ({ ...current, brandVoicePrompt: event.target.value }))}
              />
            </label>

            <label>
              Contract start
              <small>วันเริ่มต้นสัญญา ถ้าไม่กรอกจะถือว่าเริ่มใช้ได้ทันที</small>
              <input
                type="date"
                value={newAccount.contractStart}
                onChange={(event) => setNewAccount((current) => ({ ...current, contractStart: event.target.value }))}
              />
            </label>

            <label>
              Contract end
              <small>หลังวันดังกล่าว account จะถูกมองว่า expired</small>
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
                  <span className={styles.pill}>{accountDrafts[account.id]?.clientPlan ?? "normal"}</span>
                  <span className={styles.pill}>
                    {account.contractEnd ? `Ends ${new Date(account.contractEnd).toLocaleDateString("en-GB")}` : "No expiry"}
                  </span>
                </div>
                {account.role === "client" ? (
                  <>
                    <div 
                      style={{ 
                        marginTop: 16, 
                        borderTop: "1px solid rgba(255,255,255,0.05)", 
                        paddingTop: 16, 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                      onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
                    >
                      <strong style={{ margin: 0, fontSize: "0.85rem", color: "#c2cedd" }}>Client Configuration</strong>
                      <span style={{ color: "#8fa0b3", fontSize: "0.8rem" }}>
                         {expandedAccount === account.id ? "▲ Collapse" : "▼ Expand"}
                      </span>
                    </div>
                    
                    {expandedAccount === account.id && (
                      <>
                        <div className={styles.form} style={{ marginTop: 16 }}>
                      <label>
                        Access status
                        <select
                          value={accountDrafts[account.id]?.status ?? account.status}
                          onChange={(event) =>
                            updateAccountDraft(account.id, "status", event.target.value as ManagedAccountDraft["status"])
                          }
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

                      <label>
                        Plan
                        <select
                          value={accountDrafts[account.id]?.clientPlan ?? "normal"}
                          onChange={(event) =>
                            updateAccountDraft(
                              account.id,
                              "clientPlan",
                              event.target.value as "normal" | "premium" | "pro"
                            )
                          }
                        >
                          <option value="normal">normal</option>
                          <option value="premium">premium</option>
                          <option value="pro">pro</option>
                        </select>
                      </label>

                      <label>
                        Research provider
                        <select
                          value={accountDrafts[account.id]?.clientResearchProvider ?? "tavily"}
                          onChange={(event) =>
                            updateAccountDraft(
                              account.id,
                              "clientResearchProvider",
                              event.target.value as "tavily" | "dataforseo"
                            )
                          }
                        >
                          <option value="tavily">tavily</option>
                          <option value="dataforseo">dataforseo</option>
                        </select>
                      </label>

                      <label>
                        WordPress URL
                        <input
                          value={accountDrafts[account.id]?.clientWordpressUrl ?? ""}
                          onChange={(event) => updateAccountDraft(account.id, "clientWordpressUrl", event.target.value)}
                        />
                      </label>

                      <label>
                        WordPress username
                        <input
                          value={accountDrafts[account.id]?.clientWordpressUsername ?? ""}
                          onChange={(event) =>
                            updateAccountDraft(account.id, "clientWordpressUsername", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        WordPress app password
                        <input
                          type="password"
                          value={accountDrafts[account.id]?.clientWordpressAppPassword ?? ""}
                          onChange={(event) =>
                            updateAccountDraft(account.id, "clientWordpressAppPassword", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Default publish status
                        <select
                          value={accountDrafts[account.id]?.clientWordpressPublishStatus ?? "draft"}
                          onChange={(event) =>
                            updateAccountDraft(
                              account.id,
                              "clientWordpressPublishStatus",
                              event.target.value as "draft" | "publish"
                            )
                          }
                        >
                          <option value="draft">draft</option>
                          <option value="publish">publish</option>
                        </select>
                      </label>

                      <label>
                        Company article prompt
                        <textarea
                          rows={5}
                          value={accountDrafts[account.id]?.clientArticlePrompt ?? ""}
                          onChange={(event) => updateAccountDraft(account.id, "clientArticlePrompt", event.target.value)}
                        />
                      </label>

                      <label>
                        Company expertise prompt
                        <textarea
                          rows={4}
                          value={accountDrafts[account.id]?.clientExpertisePrompt ?? ""}
                          onChange={(event) =>
                            updateAccountDraft(account.id, "clientExpertisePrompt", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Brand voice prompt
                        <textarea
                          rows={4}
                          value={accountDrafts[account.id]?.clientBrandVoicePrompt ?? ""}
                          onChange={(event) => updateAccountDraft(account.id, "clientBrandVoicePrompt", event.target.value)}
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
                            contractEnd: accountDrafts[account.id]?.contractEnd ?? "",
                            clientArticlePrompt: accountDrafts[account.id]?.clientArticlePrompt ?? "",
                            clientExpertisePrompt: accountDrafts[account.id]?.clientExpertisePrompt ?? "",
                            clientBrandVoicePrompt: accountDrafts[account.id]?.clientBrandVoicePrompt ?? "",
                            clientResearchProvider: accountDrafts[account.id]?.clientResearchProvider ?? "tavily",
                            clientPlan: accountDrafts[account.id]?.clientPlan ?? "normal",
                            clientWordpressUrl: accountDrafts[account.id]?.clientWordpressUrl ?? "",
                            clientWordpressUsername: accountDrafts[account.id]?.clientWordpressUsername ?? "",
                            clientWordpressAppPassword: accountDrafts[account.id]?.clientWordpressAppPassword ?? "",
                            clientWordpressPublishStatus:
                              accountDrafts[account.id]?.clientWordpressPublishStatus ?? "draft"
                          })
                        }
                        type="button"
                      >
                        Save account settings
                      </button>
                    </div>
                      </>
                    )}
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
