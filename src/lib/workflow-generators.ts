import { mockWorkflowJob } from "@/data/mock-workflow";
import { ArticleDraft, ContentBrief, ResearchPack, TopicIdea, WorkflowJob } from "@/types/workflow";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function generateIdeas(seedKeyword: string): TopicIdea[] {
  return [
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}เป็นโรคอะไรได้บ้าง`,
      angle: `สรุปอาการ ปัญหาที่พบบ่อย และวิธีสังเกต ${seedKeyword} ให้ทันก่อนอาการลุกลาม`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 86,
      whyItMatters: "เหมาะกับบทความแก้ปัญหาและดึงคนที่มี intent สูง",
      thaiSignal: "คอมมูนิตี้ไทยมักถามเรื่องอาการเริ่มต้นและการดูแลเบื้องต้น",
      globalSignal: "บทความต่างประเทศมักมี symptom-based structure ที่ชัด",
      relatedKeywords: [`โรค${seedKeyword}`, `${seedKeyword}ซึม`, `${seedKeyword}ป่วย`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}ชอบน้ำด่างไหม`,
      angle: `อธิบายค่าน้ำที่เหมาะกับ ${seedKeyword} พร้อมวิธีปรับสภาพน้ำอย่างปลอดภัย`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 91,
      whyItMatters: "ช่วยสร้าง organic traffic จากคำถามพื้นฐานที่คนค้นหาบ่อย",
      thaiSignal: "ตลาดไทยยังอธิบายเรื่อง pH และความกระด้างแบบสับสนกันอยู่",
      globalSignal: "ต่างประเทศมีข้อมูลเชิงเทคนิคที่นำมา localize ได้ดี",
      relatedKeywords: [`${seedKeyword} pH`, `น้ำด่าง${seedKeyword}`, `ปรับน้ำ${seedKeyword}`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}กินอะไรดีที่สุด`,
      angle: `สรุปอาหารหลัก อาหารเสริม และข้อควรระวังเรื่องการให้อาหาร ${seedKeyword}`,
      searchIntent: "commercial",
      difficulty: "medium",
      confidence: 82,
      whyItMatters: "ต่อยอดสู่หน้าสินค้าและบทความรีวิวได้ง่าย",
      thaiSignal: "คำถามเรื่องอาหารและการให้อาหารวันละกี่ครั้งมีตลอด",
      globalSignal: "คู่แข่งต่างประเทศทำ listicle และเปรียบเทียบอาหารไว้เยอะ",
      relatedKeywords: [`อาหาร${seedKeyword}`, `${seedKeyword}กินวันละกี่ครั้ง`, `${seedKeyword}ท้องอืด`]
    }
  ];
}

export function generateResearch(seedKeyword: string, selectedIdea: TopicIdea): ResearchPack {
  return {
    objective: `รวบรวมข้อมูลไทยและต่างประเทศเพื่อเขียนบทความเรื่อง "${selectedIdea.title}" จาก seed keyword "${seedKeyword}"`,
    audience: `เจ้าของหรือผู้สนใจเรื่อง ${seedKeyword} ที่ต้องการข้อมูลเชิงปฏิบัติและเชื่อถือได้`,
    gaps: [
      "คอนเทนต์ไทยจำนวนมากยังสรุปแบบกว้างและไม่มีหลักฐานอ้างอิงชัด",
      "คู่แข่งมักไม่เชื่อมโยง pain point ของคนไทยกับข้อมูลจากต่างประเทศ",
      "บทความจำนวนมากยังไม่มี FAQ และ internal links ที่ช่วย SEO cluster"
    ],
    sources: [
      ...mockWorkflowJob.research.sources.slice(0, 2),
      {
        region: "TH",
        title: `คำถามยอดฮิตเกี่ยวกับ ${selectedIdea.title}`,
        source: "กลุ่มชุมชนผู้ใช้งานไทย",
        insight: "ช่วยหา wording และ pain point จริงของกลุ่มเป้าหมายไทย"
      },
      {
        region: "Global",
        title: `${selectedIdea.title} best practices`,
        source: "International niche blog or veterinary resource",
        insight: "ใช้เติมความน่าเชื่อถือและวิธีแก้ปัญหาเชิงลึก"
      }
    ]
  };
}

export function generateBrief(seedKeyword: string, selectedIdea: TopicIdea, research: ResearchPack): ContentBrief {
  const coreTitle = selectedIdea.title;
  return {
    title: `${coreTitle} พร้อมแนวทางดูแลและข้อมูลที่คนค้นหาจริง`,
    slug: slugify(coreTitle),
    metaTitle: `${coreTitle} | คำแนะนำและคำตอบที่ควรรู้`,
    metaDescription: `สรุปเรื่อง ${coreTitle} จากข้อมูลไทยและต่างประเทศ พร้อมคำแนะนำที่นำไปใช้ได้จริง`,
    audience: research.audience,
    angle: selectedIdea.angle,
    outline: [
      `${coreTitle}: คำตอบสั้นสำหรับคนที่อยากได้คำตอบเร็ว`,
      `สิ่งที่ควรเข้าใจก่อนเกี่ยวกับ ${seedKeyword}`,
      "ข้อมูลจากไทยที่คนถามกันบ่อย",
      "ข้อมูลจากต่างประเทศที่ช่วยเติมความน่าเชื่อถือ",
      "วิธีนำไปใช้หรือดูแลแบบไม่เสี่ยง",
      "คำถามที่พบบ่อย"
    ],
    faqs: [
      `${seedKeyword} ควรเริ่มตรวจจากอะไร`,
      `ควรหลีกเลี่ยงความเข้าใจผิดเรื่องไหน`,
      `มีสัญญาณเตือนอะไรที่ควรรีบแก้`
    ],
    internalLinks: [
      `คู่มือพื้นฐานเกี่ยวกับ ${seedKeyword}`,
      `วิธีดูแล ${seedKeyword} แบบมือใหม่`,
      `รวมปัญหาที่พบบ่อยของ ${seedKeyword}`
    ]
  };
}

export function generateDraft(brief: ContentBrief): ArticleDraft {
  return {
    intro: `บทความนี้สรุปเรื่อง "${brief.title}" ในแบบที่อ่านง่าย แต่ยังคงความน่าเชื่อถือจากการ research ทั้งไทยและต่างประเทศ`,
    sections: brief.outline.slice(0, 4).map((heading, index) => ({
      heading,
      body:
        index === 0
          ? "เริ่มจากคำตอบสั้นที่ตรงกับ search intent ก่อน แล้วค่อยขยายรายละเอียดเพื่อให้ผู้อ่านไม่ต้องหาอีกหลายหน้า"
          : "อธิบายด้วยภาษาที่เข้าใจง่าย เชื่อม pain point ของผู้อ่านกับข้อมูลอ้างอิง และสรุปข้อควรทำเป็นข้อๆ"
    })),
    conclusion:
      "ก่อนนำบทความนี้ไปเผยแพร่ ควรให้ทีมตรวจความถูกต้องเฉพาะทางและเพิ่ม internal links ตาม cluster ที่เกี่ยวข้อง"
  };
}

export function buildNewJob(seedKeyword: string, client: string): WorkflowJob {
  const ideas = generateIdeas(seedKeyword);
  const selectedIdea = ideas[0];
  const research = generateResearch(seedKeyword, selectedIdea);
  const brief = generateBrief(seedKeyword, selectedIdea, research);
  const draft = generateDraft(brief);

  return {
    id: crypto.randomUUID(),
    client,
    seedKeyword,
    stage: "idea_pool",
    selectedIdeaId: selectedIdea.id,
    ideas,
    research,
    brief,
    draft
  };
}
