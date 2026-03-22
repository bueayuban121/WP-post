import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { SettingsPage } from "@/components/settings-page";
import { listManagedUsers, requirePageSession } from "@/lib/auth";

export default function SettingsRoute() {
  return <SettingsRouteContent />;
}

async function SettingsRouteContent() {
  const currentUser = await requirePageSession();
  const managedUsers = currentUser.role === "admin" ? await listManagedUsers() : [];

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Settings</span>
        <h1 className={styles.title}>Set content defaults before the team starts generating</h1>
        <p className={styles.description}>
          หน้านี้รวมค่าตั้งต้นที่ใช้บ่อยที่สุดสำหรับโทนบทความ คำต้องห้าม ความยาวบทความ และค่า publish เบื้องต้น เพื่อให้การเริ่มงานแต่ละรอบเร็วขึ้น
        </p>
      </section>

      <SettingsPage currentUser={currentUser} managedUsers={managedUsers} />
    </main>
  );
}
