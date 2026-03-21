import { mockWorkflowJob } from "@/data/mock-workflow";
import { generateArticleImages } from "@/lib/article-images";
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
      whyItMatters: "เหมาะกับบทความแก้ปัญหาและดึงคนที่มี intent สูงก่อนซื้อหรือหาวิธีดูแล",
      thaiSignal: "คอมมูนิตี้ไทยมักถามเรื่องอาการเริ่มต้นและการดูแลเบื้องต้นที่ทำได้ทันที",
      globalSignal: "บทความต่างประเทศนิยมจัดโครงตามอาการ ทำให้ต่อยอดเป็น brief ได้ง่าย",
      relatedKeywords: [`โรค${seedKeyword}`, `${seedKeyword}ซึม`, `${seedKeyword}ป่วย`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}ชอบน้ำด่างไหม`,
      angle: `อธิบายค่าน้ำที่เหมาะกับ ${seedKeyword} พร้อมวิธีปรับสภาพน้ำอย่างปลอดภัย`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 91,
      whyItMatters: "ช่วยสร้าง organic traffic จากคำถามพื้นฐานที่คนค้นหาบ่อยและเชื่อมสู่สินค้าดูแลน้ำได้",
      thaiSignal: "ตลาดไทยยังอธิบายเรื่อง pH และความกระด้างแบบปนกันอยู่ ทำให้มีช่องว่างด้านคุณภาพเนื้อหา",
      globalSignal: "ต่างประเทศมีข้อมูลเชิงเทคนิคที่เอามา localize เป็นบทความไทยได้ดี",
      relatedKeywords: [`${seedKeyword} pH`, `น้ำด่าง${seedKeyword}`, `ปรับน้ำ${seedKeyword}`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}กินอะไรดีที่สุด`,
      angle: `สรุปอาหารหลัก อาหารเสริม และข้อควรระวังเรื่องการให้อาหาร ${seedKeyword}`,
      searchIntent: "commercial",
      difficulty: "medium",
      confidence: 82,
      whyItMatters: "ต่อยอดไปหน้าสินค้า บทความรีวิว และคอนเทนต์เชิงเปรียบเทียบได้ง่าย",
      thaiSignal: "คำถามเรื่องอาหารและการให้อาหารวันละกี่ครั้งมีเข้ามาสม่ำเสมอ",
      globalSignal: "คู่แข่งต่างประเทศทำ listicle และ comparison เยอะ จึงเหมาะกับการทำเนื้อหาแข่ง",
      relatedKeywords: [`อาหาร${seedKeyword}`, `${seedKeyword}กินวันละกี่ครั้ง`, `${seedKeyword}ท้องอืด`]
    }
  ];
}

export function generateResearch(seedKeyword: string, selectedIdea: TopicIdea): ResearchPack {
  return {
    objective: `รวบรวมข้อมูลไทยและต่างประเทศเพื่อเขียนบทความเรื่อง "${selectedIdea.title}" จาก seed keyword "${seedKeyword}"`,
    audience: `เจ้าของหรือผู้สนใจเรื่อง ${seedKeyword} ที่ต้องการข้อมูลเชิงปฏิบัติและเชื่อถือได้`,
    gaps: [
      "คอนเทนต์ไทยจำนวนมากยังสรุปแบบกว้างและไม่มีแหล่งอ้างอิงชัด",
      "คู่แข่งมักไม่เชื่อม pain point ของคนไทยกับข้อมูลต่างประเทศที่มีความละเอียดกว่า",
      "หลายบทความยังไม่มี FAQ และ internal links ที่ช่วยปั้น SEO cluster"
    ],
    sources: [
      ...mockWorkflowJob.research.sources.slice(0, 2),
      {
        region: "TH",
        title: `คำถามยอดฮิตเกี่ยวกับ ${selectedIdea.title}`,
        source: "กลุ่มชุมชนผู้ใช้งานไทย",
        insight: "ช่วยเก็บ wording และ pain point จริงของผู้ค้นหาในภาษาไทย"
      },
      {
        region: "Global",
        title: `${selectedIdea.title} best practices`,
        source: "International niche blog or veterinary resource",
        insight: "ช่วยเติมความน่าเชื่อถือและแนวทางแก้ปัญหาเชิงลึกก่อนขึ้น brief"
      }
    ]
  };
}

export function generateBrief(
  seedKeyword: string,
  selectedIdea: TopicIdea,
  research: ResearchPack
): ContentBrief {
  const coreTitle = selectedIdea.title;

  return {
    title: `${coreTitle} พร้อมแนวทางดูแลและข้อมูลที่คนค้นหาจริง`,
    slug: slugify(coreTitle),
    metaTitle: `${coreTitle} | คำแนะนำและคำตอบที่ควรรู้`,
    metaDescription: `สรุปเรื่อง ${coreTitle} จากข้อมูลไทยและต่างประเทศ พร้อมคำแนะนำที่นำไปใช้ได้จริง`,
    audience: research.audience,
    angle: selectedIdea.angle,
    publishStatus: "draft",
    categoryIds: [],
    tagIds: [],
    featuredImageUrl: "",
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
      "ควรหลีกเลี่ยงความเข้าใจผิดเรื่องไหน",
      "มีสัญญาณเตือนอะไรที่ควรรีบแก้"
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
    intro: `บทความนี้สรุปเรื่อง "${brief.title}" ในแบบที่อ่านง่าย แต่ยังคงความน่าเชื่อถือจากการรีเสิร์ชทั้งไทยและต่างประเทศ`,
    sections: brief.outline.slice(0, 4).map((heading, index) => ({
      heading,
      body:
        index === 0
          ? "เริ่มจากคำตอบสั้นที่ตรงกับ search intent ก่อน แล้วค่อยขยายรายละเอียดเพื่อให้ผู้อ่านไม่ต้องไปหาคำตอบต่อจากหลายแหล่ง"
          : "อธิบายด้วยภาษาที่เข้าใจง่าย เชื่อม pain point ของผู้อ่านกับข้อมูลอ้างอิง และสรุปเป็นข้อปฏิบัติที่นำไปใช้ต่อได้"
    })),
    conclusion:
      "ก่อนนำบทความนี้ไปเผยแพร่ ควรให้ทีมตรวจความถูกต้องเฉพาะทางและเติม internal links ตาม cluster ที่เกี่ยวข้อง"
  };
}

export function buildNewJob(seedKeyword: string, client: string): WorkflowJob {
  const ideas = generateIdeas(seedKeyword);
  const selectedIdea = ideas[0];
  const research = generateResearch(seedKeyword, selectedIdea);
  const brief = generateBrief(seedKeyword, selectedIdea, research);
  const draft = generateDraft(brief);
  const images = generateArticleImages({
    seedKeyword,
    title: brief.title,
    brief,
    draft
  });

  return {
    id: crypto.randomUUID(),
    client,
    seedKeyword,
    stage: "idea_pool",
    selectedIdeaId: selectedIdea.id,
    ideas,
    research,
    brief,
    draft,
    images
  };
}
