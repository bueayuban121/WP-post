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
    },
    {
      id: crypto.randomUUID(),
      title: `วิธีดูแล${seedKeyword}ไม่ให้ตาย`,
      angle: `สรุป checklist การดูแล ${seedKeyword} ตั้งแต่เรื่องน้ำ อาหาร อุณหภูมิ ไปจนถึงสัญญาณเตือนที่ต้องรีบแก้`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 90,
      whyItMatters: "เหมาะกับบทความ pillar ที่ต่อยอดไปหัวข้อย่อยได้หลายชุด",
      thaiSignal: "ผู้ใช้ไทยมักค้นหาแบบถามตรงๆ ว่าทำอย่างไรไม่ให้สัตว์เลี้ยงตาย",
      globalSignal: "คู่แข่งต่างประเทศนิยมทำ survival checklist และ beginner guide",
      relatedKeywords: [`ดูแล${seedKeyword}`, `${seedKeyword}ใกล้ตาย`, `${seedKeyword}เลี้ยงยังไง`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}หางเปื่อยเกิดจากอะไร`,
      angle: `อธิบายสาเหตุ อาการ และแนวทางดูแลเบื้องต้นเมื่อ ${seedKeyword} มีอาการหางเปื่อย`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 84,
      whyItMatters: "เป็นคำถามปลายโรคที่มี intent สูงและเหมาะกับการต่อยอดไปสินค้าดูแลน้ำ",
      thaiSignal: "คนไทยถามเรื่องหางเปื่อยและเกล็ดเปื่อยกันบ่อยในกลุ่มเลี้ยงปลา",
      globalSignal: "แหล่งต่างประเทศมีคำแนะนำเชิงขั้นตอนชัดเจน สามารถนำมา localize ได้ดี",
      relatedKeywords: [`${seedKeyword}หางเปื่อย`, `${seedKeyword}เชื้อรา`, `${seedKeyword}ครีบเปื่อย`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}เลี้ยงรวมกันได้ไหม`,
      angle: `ตอบคำถามเรื่องการเลี้ยง ${seedKeyword} รวมกับปลาอื่นและปัจจัยที่ทำให้เกิดการกัดกันหรือเครียด`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 83,
      whyItMatters: "ช่วยดึง traffic จากผู้เริ่มเลี้ยงและโยงต่อไปบทความขนาดตู้หรือระบบกรองได้",
      thaiSignal: "คำถามเรื่องเลี้ยงรวมกันหรือเลี้ยงกี่ตัวเป็น pain point ที่เจอบ่อย",
      globalSignal: "เว็บต่างประเทศมี data เรื่อง compatibility และ tankmate ครบถ้วน",
      relatedKeywords: [`${seedKeyword}เลี้ยงรวม`, `${seedKeyword}กี่ตัวดี`, `${seedKeyword}เข้ากับปลาอะไร`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}ต้องเปลี่ยนน้ำบ่อยแค่ไหน`,
      angle: `สรุปรอบการเปลี่ยนน้ำ ปริมาณที่เหมาะสม และข้อผิดพลาดที่ทำให้ ${seedKeyword} เครียดหลังเปลี่ยนน้ำ`,
      searchIntent: "problem-solving",
      difficulty: "low",
      confidence: 92,
      whyItMatters: "เป็นคำถามพื้นฐานที่ convert ไปบทความดูแลน้ำและอุปกรณ์กรองได้ง่าย",
      thaiSignal: "ผู้ใช้ไทยกังวลเรื่องเปลี่ยนน้ำแล้วปลาซึมหรือปลาน็อก",
      globalSignal: "มี best practice จากต่างประเทศที่อธิบายเรื่อง frequency และ water stability ชัด",
      relatedKeywords: [`เปลี่ยนน้ำ${seedKeyword}`, `${seedKeyword}ซึมหลังเปลี่ยนน้ำ`, `${seedKeyword}เปลี่ยนน้ำกี่วันครั้ง`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}ใช้ตู้ขนาดเท่าไหร่`,
      angle: `อธิบายขนาดตู้ขั้นต่ำ จำนวนตัวต่อปริมาตรน้ำ และผลเสียของการเลี้ยงแน่นเกินไป`,
      searchIntent: "commercial",
      difficulty: "low",
      confidence: 86,
      whyItMatters: "ต่อยอดไปหน้าอุปกรณ์ ตู้ปลา และระบบกรองได้ดี",
      thaiSignal: "ตลาดไทยยังมีเนื้อหาที่แนะนำขนาดตู้ไม่สม่ำเสมอ",
      globalSignal: "บทความขนาดตู้เป็น evergreen topic ที่มี search volume ต่อเนื่อง",
      relatedKeywords: [`ตู้ปลา${seedKeyword}`, `${seedKeyword}กี่ลิตร`, `${seedKeyword}ตู้เล็กได้ไหม`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}นอนก้นตู้ผิดปกติไหม`,
      angle: `แยกระหว่างพฤติกรรมพักปกติกับสัญญาณผิดปกติของ ${seedKeyword} ที่นอนก้นตู้`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 85,
      whyItMatters: "ตอบ pain point ตรงและสร้างความเชื่อมั่นได้ดีสำหรับงาน SEO แบบช่วยแก้ปัญหา",
      thaiSignal: "ผู้ใช้ไทยมักค้นคำถามเชิงอาการมากกว่าคำวิชาการ",
      globalSignal: "มีตัวอย่างอาการจากต่างประเทศที่ช่วยขยายมุมมองการวินิจฉัยได้",
      relatedKeywords: [`${seedKeyword}นอนก้นตู้`, `${seedKeyword}ซึม`, `${seedKeyword}ไม่ว่าย`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}อุณหภูมิเท่าไหร่เหมาะที่สุด`,
      angle: `อธิบายช่วงอุณหภูมิที่เหมาะกับ ${seedKeyword} และความเสี่ยงเมื่อร้อนหรือเย็นเกินไป`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 81,
      whyItMatters: "เหมาะกับบทความ evergreen และใช้เชื่อมไปหัวข้ออุปกรณ์ควบคุมอุณหภูมิได้",
      thaiSignal: "อากาศเมืองไทยมีผลกับตู้ปลาและเป็นคำถามที่เกิดตามฤดูกาล",
      globalSignal: "ต่างประเทศมีกรอบอุณหภูมิและข้อควรระวังเรื่อง stress ชัดเจน",
      relatedKeywords: [`อุณหภูมิ${seedKeyword}`, `${seedKeyword}ร้อนเกินไป`, `${seedKeyword}เย็นเกินไป`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}ควรใช้กรองแบบไหน`,
      angle: `เปรียบเทียบระบบกรองที่เหมาะกับ ${seedKeyword} ตามขนาดตู้ ปริมาณของเสีย และงบประมาณ`,
      searchIntent: "commercial",
      difficulty: "medium",
      confidence: 80,
      whyItMatters: "เชื่อมกับ intent เชิงซื้อและบทความรีวิวสินค้าได้ดี",
      thaiSignal: "คนไทยชอบหารีวิวกรองก่อนซื้อและมักกังวลเรื่องน้ำขุ่นกับกลิ่น",
      globalSignal: "คู่แข่งต่างประเทศมี comparison content ที่แข็งแรงและนำมาปรับได้",
      relatedKeywords: [`กรอง${seedKeyword}`, `${seedKeyword}น้ำขุ่น`, `${seedKeyword}ใช้กรองอะไรดี`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}ไข่ขาวขึ้นตัวเกิดจากอะไร`,
      angle: `อธิบายสาเหตุของจุดขาว เชื้อรา และการสังเกตอาการแยกโรคของ ${seedKeyword}`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 79,
      whyItMatters: "เป็นหัวข้อแก้ปัญหาเฉพาะที่เหมาะกับ FAQ และบทความเชิงอาการ",
      thaiSignal: "คำค้นแนวอาการผิวหนังของปลาเป็นคำถามซ้ำที่เจอเรื่อยๆ",
      globalSignal: "มีแหล่งต่างประเทศจำนวนมากที่อธิบาย differential diagnosis ได้ดี",
      relatedKeywords: [`${seedKeyword}จุดขาว`, `${seedKeyword}เชื้อรา`, `${seedKeyword}คันตัว`]
    },
    {
      id: crypto.randomUUID(),
      title: `${seedKeyword}เหมาะกับมือใหม่ไหม`,
      angle: `ตอบข้อดี ข้อจำกัด และสิ่งที่มือใหม่ต้องเตรียมก่อนเริ่มเลี้ยง ${seedKeyword}`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 87,
      whyItMatters: "เหมาะกับบทความ top-of-funnel และช่วยให้ผู้ใช้เข้า ecosystem เนื้อหาได้ดี",
      thaiSignal: "คำถามจากมือใหม่มักเริ่มจากสัตว์ชนิดนี้เลี้ยงยากไหม",
      globalSignal: "beginner content เป็นคีย์เวิร์ดกว้างที่ให้ traffic ต่อเนื่อง",
      relatedKeywords: [`${seedKeyword}มือใหม่`, `${seedKeyword}เลี้ยงยากไหม`, `${seedKeyword}เริ่มเลี้ยง`]
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

  return {
    id: crypto.randomUUID(),
    client,
    seedKeyword,
    stage: "idea_pool",
    selectedIdeaId: ideas[0]?.id ?? "",
    ideas,
    research: {
      objective: "",
      audience: "",
      gaps: [],
      sources: []
    },
    brief: {
      title: "",
      slug: "",
      metaTitle: "",
      metaDescription: "",
      audience: "",
      angle: "",
      publishStatus: "draft",
      categoryIds: [],
      tagIds: [],
      featuredImageUrl: "",
      outline: [],
      faqs: [],
      internalLinks: []
    },
    draft: {
      intro: "",
      sections: [],
      conclusion: ""
    },
    images: []
  };
}
