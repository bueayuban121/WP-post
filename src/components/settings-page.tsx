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
    clientWordpressPublishStatus: user.clientWordpressPublishStatus === "publish" ? "publish" : "draft"
  };
}

function createFallbackClient(userId: string): AppUserSession {
  return {
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
  };
}

function formatExpiryLabel(contractEnd: string | null) {
  if (!contractEnd) {
    return "No expiry";
  }

  return `Ends ${new Date(contractEnd).toLocaleDateString("en-GB")}`;
}

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
  const [accountDrafts, setAccountDrafts] = useState<Record<string, ManagedAccountDraft>>(() =>
    Object.fromEntries(managedUsers.map((user) => [user.id, createAccountDraft(user)]))
  );
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState<NewAccountState>(emptyNewAccount);
  const [accountStatus, setAccountStatus] = useState("");
  const [accountPending, setAccountPending] = useState(false);
  const [systemArticlePrompt, setSystemArticlePrompt] = useState("");
  const [defaultResearchProvider, setDefaultResearchProvider] = useState<"tavily" | "dataforseo">("tavily");
  const [promptSaved, setPromptSaved] = useState("");

  function updateSetting<K extends keyof SavedSettings>(key: K, value: SavedSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateNewAccount<K extends keyof NewAccountState>(key: K, value: NewAccountState[K]) {
    setNewAccount((current) => ({ ...current, [key]: value }));
  }

  function updateAccountDraft<K extends keyof ManagedAccountDraft>(
    userId: string,
    field: K,
    value: ManagedAccountDraft[K]
  ) {
    setAccountDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? createAccountDraft(createFallbackClient(userId))),
        [field]: value
      }
    }));
  }

  function saveLocalDefaults() {
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

        if (!response.ok) {
          return;
        }

        setSystemArticlePrompt(data.systemArticlePrompt ?? "");
        setDefaultResearchProvider(data.defaultResearchProvider === "dataforseo" ? "dataforseo" : "tavily");
      } catch {
        // Keep the fields locally editable if the request fails.
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
        throw new Error(data.error ?? "Unable to save AI settings.");
      }

      setSystemArticlePrompt(data.systemArticlePrompt ?? "");
      setDefaultResearchProvider(data.defaultResearchProvider === "dataforseo" ? "dataforseo" : "tavily");
      setPromptSaved("AI workflow settings saved.");
    } catch (error) {
      setPromptSaved(error instanceof Error ? error.message : "Unable to save AI settings.");
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
      setNewAccount(emptyNewAccount);
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

  return (
    <section className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <span className={styles.eyebrow}>Workspace Defaults</span>
            <h2>Default generation settings</h2>
            <p>ค่านี้ถูกใช้ใน browser ปัจจุบันสำหรับ tone, banned words และความยาวบทความ ช่วยให้เริ่มงานใหม่ได้เร็วขึ้นโดยไม่ต้องตั้งซ้ำทุกครั้ง</p>
          </div>
          <span className={styles.badge}>Workspace</span>
        </div>

        <div className={styles.form}>
          <label>
            Tone
            <small>โทนหลักของบทความ เช่น calm expert, premium editorial หรือ direct conversion</small>
            <input value={settings.tone} onChange={(event) => updateSetting("tone", event.target.value)} />
          </label>

          <label>
            Restricted words
            <small>คำที่ไม่ต้องการให้ระบบใช้ในบทความ คั่นด้วย comma</small>
            <textarea
              rows={4}
              value={settings.restrictedWords}
              onChange={(event) => updateSetting("restrictedWords", event.target.value)}
            />
          </label>

          <label>
            Article length
            <small>ความยาวเป้าหมายของบทความ เช่น 1800 หรือ 2200 คำ</small>
            <input value={settings.articleLength} onChange={(event) => updateSetting("articleLength", event.target.value)} />
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={saveLocalDefaults} type="button">
            Save defaults
          </button>
          {saved ? <span className={styles.success}>Saved to this browser</span> : null}
        </div>
      </section>

      {currentUser.role === "admin" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>AI Workflow Control</span>
              <h2>Global editorial guidance</h2>
              <p>ส่วนนี้ยังจำเป็นอยู่ เพราะเป็นกฎกลางที่ถูกส่งเข้า brief, draft และ polish ก่อนจะซ้อน prompt เฉพาะลูกค้าเข้าไปอีกชั้น</p>
            </div>
            <span className={styles.badge}>Admin only</span>
          </div>

          <div className={styles.form}>
            <label>
              Global writing rules
              <small>ใช้สำหรับกฎกลางของระบบ เช่นระดับความเป็นธรรมชาติ ความเข้มของ SEO สิ่งที่ควรเน้น และสิ่งที่ห้ามทำ ไม่ควรใส่ข้อมูลแบรนด์เฉพาะรายที่นี่</small>
              <textarea
                rows={8}
                value={systemArticlePrompt}
                onChange={(event) => setSystemArticlePrompt(event.target.value)}
              />
            </label>

            <label>
              Default research provider
              <small>กำหนด provider กลางของระบบ ลูกค้ารายไหนที่ไม่ได้ตั้ง override จะใช้ค่านี้</small>
              <select
                value={defaultResearchProvider}
                onChange={(event) => setDefaultResearchProvider(event.target.value as "tavily" | "dataforseo")}
              >
                <option value="tavily">tavily</option>
                <option value="dataforseo">dataforseo</option>
              </select>
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={accountPending} onClick={() => void saveSystemPrompt()} type="button">
              {accountPending ? "Saving AI settings..." : "Save AI settings"}
            </button>
            {promptSaved ? <span className={styles.success}>{promptSaved}</span> : null}
          </div>
        </section>
      ) : null}

      {currentUser.role === "admin" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.eyebrow}>Client Control</span>
              <h2>Client accounts and WordPress settings</h2>
              <p>สร้างลูกค้าใหม่ พร้อมเก็บ prompt เฉพาะธุรกิจ แพ็กการใช้งาน และค่าปลายทาง WordPress ไว้ใน account เดียวกัน</p>
            </div>
            <span className={styles.badge}>Admin only</span>
          </div>

          <div className={styles.form}>
            <label>
              Client name
              <small>ชื่อบริษัทหรือแบรนด์ที่จะใช้เป็น scope ของงานและปลายทาง publish</small>
              <input value={newAccount.clientName} onChange={(event) => updateNewAccount("clientName", event.target.value)} />
            </label>

            <label>
              Contact name
              <small>ชื่อผู้ใช้งานหรือชื่อผู้ประสานงานฝั่งลูกค้า</small>
              <input value={newAccount.name} onChange={(event) => updateNewAccount("name", event.target.value)} />
            </label>

            <label>
              Login email
              <small>อีเมลที่ลูกค้าใช้เข้าสู่ระบบ</small>
              <input value={newAccount.email} onChange={(event) => updateNewAccount("email", event.target.value)} />
            </label>

            <label>
              Password
              <small>รหัสผ่านชั่วคราวสำหรับ account ใหม่นี้</small>
              <input type="password" value={newAccount.password} onChange={(event) => updateNewAccount("password", event.target.value)} />
            </label>

            <label>
              Research provider
              <small>เลือก provider สำหรับ keyword discovery และ research ของลูกค้ารายนี้</small>
              <select
                value={newAccount.researchProvider}
                onChange={(event) => updateNewAccount("researchProvider", event.target.value as "tavily" | "dataforseo")}
              >
                <option value="tavily">tavily</option>
                <option value="dataforseo">dataforseo</option>
              </select>
            </label>

            <label>
              Plan
              <small>กำหนดระดับแพ็กเพื่อคุม research depth, SERP depth และคุณภาพ text-on-image</small>
              <select
                value={newAccount.clientPlan}
                onChange={(event) => updateNewAccount("clientPlan", event.target.value as "normal" | "premium" | "pro")}
              >
                <option value="normal">normal</option>
                <option value="premium">premium</option>
                <option value="pro">pro</option>
              </select>
            </label>

            <label>
              WordPress URL
              <small>โดเมนปลายทางของลูกค้ารายนี้ เช่น https://example.com</small>
              <input value={newAccount.wordpressUrl} onChange={(event) => updateNewAccount("wordpressUrl", event.target.value)} />
            </label>

            <label>
              WordPress username
              <small>ชื่อผู้ใช้ WordPress สำหรับการ publish ของลูกค้ารายนี้</small>
              <input
                value={newAccount.wordpressUsername}
                onChange={(event) => updateNewAccount("wordpressUsername", event.target.value)}
              />
            </label>

            <label>
              WordPress app password
              <small>App password ของ WordPress สำหรับ publish ของลูกค้ารายนี้</small>
              <input
                type="password"
                value={newAccount.wordpressAppPassword}
                onChange={(event) => updateNewAccount("wordpressAppPassword", event.target.value)}
              />
            </label>

            <label>
              Default publish status
              <small>สถานะเริ่มต้นเมื่อส่งโพสต์ขึ้น WordPress ของลูกค้ารายนี้</small>
              <select
                value={newAccount.wordpressPublishStatus}
                onChange={(event) => updateNewAccount("wordpressPublishStatus", event.target.value as "draft" | "publish")}
              >
                <option value="draft">draft</option>
                <option value="publish">publish</option>
              </select>
            </label>

            <label>
              Client article rules
              <small>กฎการเขียนหรือเงื่อนไขเฉพาะลูกค้ารายนี้ เช่นสิ่งที่ต้องเน้น มุมที่ต้องการ หรือรูปแบบการเล่า</small>
              <textarea rows={5} value={newAccount.articlePrompt} onChange={(event) => updateNewAccount("articlePrompt", event.target.value)} />
            </label>

            <label>
              Client expertise
              <small>ใส่ domain knowledge หรือข้อเท็จจริงเฉพาะธุรกิจที่ระบบควรรู้ก่อนเขียน</small>
              <textarea rows={4} value={newAccount.expertisePrompt} onChange={(event) => updateNewAccount("expertisePrompt", event.target.value)} />
            </label>

            <label>
              Brand voice
              <small>กำหนดโทนแบรนด์ น้ำเสียง และลักษณะการสื่อสารของลูกค้ารายนี้</small>
              <textarea rows={4} value={newAccount.brandVoicePrompt} onChange={(event) => updateNewAccount("brandVoicePrompt", event.target.value)} />
            </label>

            <label>
              Contract start
              <small>วันเริ่มต้นสัญญา ถ้าไม่กรอกจะถือว่าใช้งานได้ทันที</small>
              <input type="date" value={newAccount.contractStart} onChange={(event) => updateNewAccount("contractStart", event.target.value)} />
            </label>

            <label>
              Contract end
              <small>หลังวันดังกล่าว account จะถูกมองว่า expired</small>
              <input type="date" value={newAccount.contractEnd} onChange={(event) => updateNewAccount("contractEnd", event.target.value)} />
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.primaryButton} disabled={accountPending} onClick={() => void createAccount()} type="button">
              {accountPending ? "Saving account..." : "Create client account"}
            </button>
            {accountStatus ? <span className={styles.success}>{accountStatus}</span> : null}
          </div>

          <div className={styles.stack}>
            {accounts.map((account) => {
              const draft = accountDrafts[account.id] ?? createAccountDraft(account);
              const isExpanded = expandedAccount === account.id;

              return (
                <article key={account.id} className={styles.projectCard}>
                  <strong>{account.clientName ?? account.name}</strong>
                  <p className={styles.muted}>
                    {account.email} · {account.role}
                  </p>

                  <div className={styles.projectMeta}>
                    <span className={styles.pill}>{account.status}</span>
                    <span className={styles.pill}>{draft.clientPlan}</span>
                    <span className={styles.pill}>{formatExpiryLabel(account.contractEnd)}</span>
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
                        onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                      >
                        <strong style={{ margin: 0, fontSize: "0.85rem", color: "#c2cedd" }}>Client configuration</strong>
                        <span style={{ color: "#8fa0b3", fontSize: "0.8rem" }}>{isExpanded ? "Hide details" : "Show details"}</span>
                      </div>

                      {isExpanded ? (
                        <>
                          <div className={styles.form} style={{ marginTop: 16 }}>
                            <label>
                              Access status
                              <select
                                value={draft.status}
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
                                value={draft.contractEnd}
                                onChange={(event) => updateAccountDraft(account.id, "contractEnd", event.target.value)}
                              />
                            </label>

                            <label>
                              Plan
                              <select
                                value={draft.clientPlan}
                                onChange={(event) =>
                                  updateAccountDraft(account.id, "clientPlan", event.target.value as "normal" | "premium" | "pro")
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
                                value={draft.clientResearchProvider}
                                onChange={(event) =>
                                  updateAccountDraft(account.id, "clientResearchProvider", event.target.value as "tavily" | "dataforseo")
                                }
                              >
                                <option value="tavily">tavily</option>
                                <option value="dataforseo">dataforseo</option>
                              </select>
                            </label>

                            <label>
                              WordPress URL
                              <input
                                value={draft.clientWordpressUrl}
                                onChange={(event) => updateAccountDraft(account.id, "clientWordpressUrl", event.target.value)}
                              />
                            </label>

                            <label>
                              WordPress username
                              <input
                                value={draft.clientWordpressUsername}
                                onChange={(event) => updateAccountDraft(account.id, "clientWordpressUsername", event.target.value)}
                              />
                            </label>

                            <label>
                              WordPress app password
                              <input
                                type="password"
                                value={draft.clientWordpressAppPassword}
                                onChange={(event) => updateAccountDraft(account.id, "clientWordpressAppPassword", event.target.value)}
                              />
                            </label>

                            <label>
                              Default publish status
                              <select
                                value={draft.clientWordpressPublishStatus}
                                onChange={(event) =>
                                  updateAccountDraft(account.id, "clientWordpressPublishStatus", event.target.value as "draft" | "publish")
                                }
                              >
                                <option value="draft">draft</option>
                                <option value="publish">publish</option>
                              </select>
                            </label>

                            <label>
                              Client article rules
                              <textarea
                                rows={5}
                                value={draft.clientArticlePrompt}
                                onChange={(event) => updateAccountDraft(account.id, "clientArticlePrompt", event.target.value)}
                              />
                            </label>

                            <label>
                              Client expertise
                              <textarea
                                rows={4}
                                value={draft.clientExpertisePrompt}
                                onChange={(event) => updateAccountDraft(account.id, "clientExpertisePrompt", event.target.value)}
                              />
                            </label>

                            <label>
                              Brand voice
                              <textarea
                                rows={4}
                                value={draft.clientBrandVoicePrompt}
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
                                  status: draft.status,
                                  contractEnd: draft.contractEnd,
                                  clientArticlePrompt: draft.clientArticlePrompt,
                                  clientExpertisePrompt: draft.clientExpertisePrompt,
                                  clientBrandVoicePrompt: draft.clientBrandVoicePrompt,
                                  clientResearchProvider: draft.clientResearchProvider,
                                  clientPlan: draft.clientPlan,
                                  clientWordpressUrl: draft.clientWordpressUrl,
                                  clientWordpressUsername: draft.clientWordpressUsername,
                                  clientWordpressAppPassword: draft.clientWordpressAppPassword,
                                  clientWordpressPublishStatus: draft.clientWordpressPublishStatus
                                })
                              }
                              type="button"
                            >
                              Save account settings
                            </button>
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
