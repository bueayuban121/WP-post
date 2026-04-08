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
          หน้านี้รวมค่าที่ใช้บ่อยที่สุดของระบบ ทั้งกฎการเขียนกลาง การตั้งค่าลูกค้า แพ็กการใช้งาน และปลายทาง
          WordPress เพื่อให้ workflow แต่ละรอบเริ่มได้เร็วขึ้นและคุมคุณภาพได้ง่ายขึ้น
        </p>
      </section>

      <SettingsPage currentUser={currentUser} managedUsers={managedUsers} />
    </main>
  );
}
