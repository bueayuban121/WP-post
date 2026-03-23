import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { FacebookPage } from "@/components/facebook-page";
import { requirePageSession } from "@/lib/auth";

export default async function FacebookRoute({
  searchParams
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  await requirePageSession();
  const params = await searchParams;

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Facebook</span>
        <h1 className={styles.title}>Turn finished articles into Facebook-ready posts</h1>
        <p className={styles.description}>
          สรุปบทความเป็น caption สำหรับ Facebook, เลือกรูปที่จะใช้โพสต์, และเตรียมส่งเข้า workflow
          เดิมใน n8n
        </p>
      </section>

      <FacebookPage initialJobId={params.job ?? ""} />
    </main>
  );
}
