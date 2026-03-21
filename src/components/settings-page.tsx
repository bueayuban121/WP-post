"use client";

import { useState } from "react";
import styles from "./console-pages.module.css";

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

export function SettingsPage() {
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

  function update<K extends keyof SavedSettings>(key: K, value: SavedSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setSaved(true);
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
    </section>
  );
}
