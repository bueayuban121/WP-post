import Link from "next/link";
import { ConsoleNav } from "@/components/console-nav";
import styles from "@/components/console-pages.module.css";
import { listJobs } from "@/lib/job-store";

const stageLabels = {
  idea_pool: "Idea pool",
  selected: "Selected",
  researching: "Research ready",
  brief_ready: "Brief ready",
  drafting: "Draft ready",
  review: "In review",
  approved: "Approved",
  published: "Published"
} as const;

export default async function ProjectsPage() {
  const jobs = await listJobs();
  const projectMap = new Map<string, (typeof jobs)[number][]>();

  for (const job of jobs) {
    const current = projectMap.get(job.client) ?? [];
    current.push(job);
    projectMap.set(job.client, current);
  }

  const projects = Array.from(projectMap.entries()).map(([client, items]) => ({
    client,
    jobs: items.length,
    latestJobId: items[0]?.id ?? "",
    latestKeyword: items[0]?.seedKeyword ?? "-",
    published: items.filter((item) => item.stage === "published").length,
    latestStage: items[0]?.stage ?? "idea_pool"
  }));

  return (
    <main className={styles.page}>
      <ConsoleNav />

      <section className={styles.hero}>
        <span className={styles.eyebrow}>Projects</span>
        <h1 className={styles.title}>Manage content projects from one workspace</h1>
        <p className={styles.description}>
          ดูภาพรวมของแต่ละโปรเจกต์ว่ามีคีย์เวิร์ดเท่าไร งานล่าสุดอยู่ขั้นไหน และพร้อมกดกลับไปทำ workflow ต่อได้ทันที
        </p>
      </section>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Total jobs</span>
          <strong>{jobs.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Published jobs</span>
          <strong>{jobs.filter((job) => job.stage === "published").length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>In progress</span>
          <strong>{jobs.filter((job) => job.stage !== "published").length}</strong>
        </article>
      </section>

      {projects.length > 0 ? (
        <section className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Project list</span>
                <h2>Active projects</h2>
                <p>เลือกดูแต่ละโปรเจกต์จากชื่อเว็บไซต์หรือทีมที่ใช้งาน แล้วกลับไปทำคีย์เวิร์ดต่อใน workflow หลัก</p>
              </div>
              <Link className={styles.primaryButton} href="/">
                Create project
              </Link>
            </div>

            <div className={styles.stack}>
              {projects.map((project) => (
                <article key={project.client} className={styles.projectCard}>
                  <strong>{project.client}</strong>
                  <p className={styles.muted}>Latest keyword: {project.latestKeyword}</p>
                  <div className={styles.projectMeta}>
                    <span className={styles.pill}>{project.jobs} jobs</span>
                    <span className={styles.pill}>{project.published} published</span>
                    <span className={styles.pill}>{stageLabels[project.latestStage]}</span>
                  </div>
                  <div className={styles.actions}>
                    <Link className={styles.linkButton} href={`/?job=${project.latestJobId}&tab=expand`}>
                      Open keywords
                    </Link>
                    <Link className={styles.linkButton} href={`/articles?job=${project.latestJobId}`}>
                      Open article
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.eyebrow}>Next step</span>
                <h2>Open the workflow</h2>
                <p>หน้า workflow หลักยังเป็นศูนย์กลางสำหรับสร้างคีย์เวิร์ด รีเสิร์ช สร้างบทความ และส่งขึ้น WordPress</p>
              </div>
            </div>
            <div className={styles.helperList}>
              <div className={styles.settingCard}>
                <strong>Keywords</strong>
                <p className={styles.muted}>แตกคีย์เวิร์ด 10-15 คำจาก seed keyword แล้วเลือกคำที่จะเอาไปรีเสิร์ชต่อ</p>
              </div>
              <div className={styles.settingCard}>
                <strong>Articles</strong>
                <p className={styles.muted}>แก้ SEO brief, draft, image set และส่ง publish queue ได้ในหน้าเดียว</p>
              </div>
              <Link className={styles.linkButton} href="/">
                Open workflow
              </Link>
            </div>
          </section>
        </section>
      ) : (
        <section className={styles.emptyState}>
          <strong>ยังไม่มีโปรเจกต์</strong>
          <p className={styles.muted}>เริ่มต้นด้วยการสร้างโปรเจกต์จาก seed keyword บนหน้า workflow หลัก</p>
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/">
              Go to workflow
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
