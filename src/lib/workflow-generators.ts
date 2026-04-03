import { mockWorkflowJob } from "@/data/mock-workflow";
import { generateIdeasFromDataForSeo } from "@/lib/dataforseo";
import { normalizeGenerationSettings } from "@/lib/generation-settings";
import { generateKeywordIdeasWithOpenAi } from "@/lib/openai";
import type { ResearchProvider } from "@/lib/research-provider-config";
import { tavilySearch } from "@/lib/tavily";
import type {
  ArticleDraft,
  ContentBrief,
  ResearchPack,
  ResearchSource,
  TopicIdea,
  WorkflowJob
} from "@/types/workflow";

type IdeaBlueprint = {
  title: string;
  angle: string;
  searchIntent: TopicIdea["searchIntent"];
  difficulty: TopicIdea["difficulty"];
  confidence: number;
  whyItMatters: string;
  thaiSignal: string;
  globalSignal: string;
  relatedKeywords: string[];
};

function slugify(value: string) {
  const cleaned = value
    .normalize("NFKC")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "seo-article";
}

function trimSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]) {
  return [...new Set(values.map((value) => trimSentence(value)).filter(Boolean))];
}

function buildKeywordCluster(seedKeyword: string, hints: string[]) {
  return dedupe(
    [
      seedKeyword,
      ...hints.map((hint) => `${seedKeyword}${hint}`),
      ...hints.map((hint) => `${hint}${seedKeyword}`)
    ].slice(0, 6)
  );
}

function detectDomain(seedKeyword: string) {
  const normalized = seedKeyword.toLowerCase();

  if (/ปลา|แมว|สุนัข|สัตว์|ตู้ปลา|เลี้ยง/.test(seedKeyword)) {
    return "pet";
  }

  if (/seo|cro|conversion|wordpress|website|content|ads|marketing|landing page/i.test(normalized)) {
    return "marketing";
  }

  return "generic";
}

function buildPetIdeas(seedKeyword: string): IdeaBlueprint[] {
  return [
    {
      title: `${seedKeyword} ชอบน้ำแบบไหน`,
      angle: `อธิบายค่าน้ำ ค่า pH อุณหภูมิ และสภาพแวดล้อมที่เหมาะกับ ${seedKeyword} แบบใช้งานได้จริง`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 92,
      whyItMatters: "เป็นคำค้นที่คนถามซ้ำสูงและต่อยอดไปบทความดูแลน้ำ อุปกรณ์ และการแก้ปัญหาได้ดี",
      thaiSignal: "คำถามภาษาไทยมักเริ่มจากอาการปลาเครียด น้ำขุ่น หรือสงสัยว่าต้องใช้น้ำแบบไหนกันแน่",
      globalSignal: "แหล่งต่างประเทศมีข้อมูลเรื่อง water stability, pH และ stress response ที่ใช้ยืนยันบทความได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" pH", " น้ำ", " อุณหภูมิ", " น้ำด่าง"])
    },
    {
      title: `${seedKeyword} กินอะไรดี`,
      angle: `สรุปอาหารหลัก อาหารเสริม ปริมาณ และข้อผิดพลาดที่ทำให้ ${seedKeyword} ท้องอืดหรือโตช้า`,
      searchIntent: "commercial",
      difficulty: "medium",
      confidence: 88,
      whyItMatters: "ต่อยอดไปบทความเปรียบเทียบอาหาร รีวิวสินค้า และบทความเชิงการซื้อได้ตรง intent",
      thaiSignal: "คนค้นมักถามเรื่องให้อาหารวันละกี่ครั้ง อาหารแบบไหนจมน้ำหรือช่วยให้สีสวย",
      globalSignal: "คู่แข่งต่างประเทศมักทำ comparison content และ feeding schedule ที่นำมา localize ได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" อาหาร", " กินอะไร", " ให้อาหาร", " ท้องอืด"])
    },
    {
      title: `${seedKeyword} เป็นโรคอะไรได้บ้าง`,
      angle: `แยกอาการเริ่มต้น สาเหตุที่พบบ่อย และจังหวะที่ควรรีบแยกปลาหรือรักษา`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 90,
      whyItMatters: "เป็นหัวข้อที่มี urgency สูงและสร้างความเชื่อมั่นได้ดีถ้าจัดข้อมูลแบบ symptom-based",
      thaiSignal: "คำถามไทยมักมาจากอาการ เช่น ซึม ว่ายเอียง เกล็ดพอง หรือมีจุดขาว",
      globalSignal: "แหล่งต่างประเทศมี clinical framing และ best-practice care ที่ช่วยยกระดับเนื้อหาได้มาก",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" ป่วย", " โรค", " ซึม", " จุดขาว"])
    },
    {
      title: `วิธีดูแล ${seedKeyword} ไม่ให้ตาย`,
      angle: `ทำ checklist การดูแล ${seedKeyword} ตั้งแต่น้ำ อาหาร ตู้ปลา ไปจนถึงสัญญาณเตือนที่ไม่ควรมองข้าม`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 91,
      whyItMatters: "เหมาะกับบทความ pillar ที่เชื่อมไปหัวข้อย่อยและคุม search intent กว้างได้ดี",
      thaiSignal: "ผู้ใช้ไทยนิยมถามตรง ๆ ว่าทำยังไงไม่ให้สัตว์เลี้ยงตาย โดยเฉพาะหลังเริ่มเลี้ยงไม่นาน",
      globalSignal: "beginner guide จากต่างประเทศช่วยเติมกรอบการดูแลแบบระบบและสร้าง trust ได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" ดูแล", " มือใหม่", " ไม่ให้ตาย", " เริ่มเลี้ยง"])
    },
    {
      title: `${seedKeyword} ต้องเปลี่ยนน้ำบ่อยแค่ไหน`,
      angle: `สรุปรอบการเปลี่ยนน้ำ ปริมาณที่เหมาะสม และข้อผิดพลาดที่ทำให้ ${seedKeyword} เครียดหลังเปลี่ยนน้ำ`,
      searchIntent: "problem-solving",
      difficulty: "low",
      confidence: 89,
      whyItMatters: "ตอบ pain point ตรงและโยงสู่บทความคุณภาพน้ำ ระบบกรอง และอุปกรณ์ได้ทันที",
      thaiSignal: "คนเลี้ยงมักกังวลว่าการเปลี่ยนน้ำบ่อยไปหรือเร็วไปจะทำให้ปลาแย่กว่าเดิม",
      globalSignal: "แหล่งสากลมี best practice เรื่อง water change frequency และ stability ที่ชัดเจน",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" เปลี่ยนน้ำ", " เครียด", " น้ำใหม่", " กี่วัน"])
    },
    {
      title: `${seedKeyword} ใช้ตู้ขนาดเท่าไร`,
      angle: `อธิบายขนาดตู้ขั้นต่ำ จำนวนตัวต่อพื้นที่ และผลเสียของการเลี้ยงแน่นเกินไป`,
      searchIntent: "commercial",
      difficulty: "low",
      confidence: 84,
      whyItMatters: "ต่อยอดไปบทความรีวิวตู้ปลา กรอง และอุปกรณ์เสริมได้เป็นธรรมชาติ",
      thaiSignal: "คำถามไทยมักมาพร้อมข้อจำกัดเรื่องพื้นที่และงบ จึงต้องตอบให้ practical มากกว่าทฤษฎี",
      globalSignal: "แหล่งต่างประเทศให้ baseline เรื่อง stocking density ที่ใช้เป็น reference ได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" ตู้", " กี่ลิตร", " พื้นที่", " เลี้ยงกี่ตัว"])
    },
    {
      title: `${seedKeyword} มีอาการเครียดดูยังไง`,
      angle: `อธิบายสัญญาณเตือน พฤติกรรมที่เปลี่ยนไป และวิธีเช็กสภาพแวดล้อมก่อนอาการลุกลาม`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 85,
      whyItMatters: "ตอบคำถามเชิงอาการที่คนค้นหาจริงและช่วยให้บทความดูใช้งานได้ ไม่ใช่แค่เชิงนิยาม",
      thaiSignal: "คำถามในไทยมักใช้ภาษาง่าย เช่น ซึม ไม่กิน นอนก้นตู้ หรือว่ายผิดปกติ",
      globalSignal: "ข้อมูลสากลมักอธิบาย stress markers และ environmental triggers ได้ละเอียดกว่า",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" เครียด", " ซึม", " นอนก้นตู้", " ไม่กิน"])
    }
  ];
}

function buildMarketingIdeas(seedKeyword: string): IdeaBlueprint[] {
  return [
    {
      title: `${seedKeyword} คืออะไร`,
      angle: `อธิบายความหมาย หลักคิด วิธีทำงาน และทำไมธุรกิจควรเริ่มใช้ ${seedKeyword}`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 93,
      whyItMatters: "เหมาะกับหน้า pillar และมีโอกาสครอบทั้งคำค้นเชิงความรู้และเชิงตัดสินใจ",
      thaiSignal: "ผู้ใช้ไทยมักเริ่มจากคำถามนิยามก่อน แล้วค่อยค้นต่อเรื่องวิธีใช้และเครื่องมือ",
      globalSignal: "แหล่งต่างประเทศมี framework และ terminology ที่ช่วยให้บทความดูมืออาชีพขึ้น",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" คืออะไร", " ความหมาย", " ทำงานยังไง", " ใช้ทำอะไร"])
    },
    {
      title: `วิธีวัดผล ${seedKeyword}`,
      angle: `สรุป metric, KPI, baseline และวิธีดูว่า ${seedKeyword} ที่ทำอยู่ได้ผลจริงหรือไม่`,
      searchIntent: "informational",
      difficulty: "medium",
      confidence: 88,
      whyItMatters: "ตอบโจทย์คนที่ไม่ได้ต้องการรู้แค่นิยาม แต่ต้องการลงมือและวัดผลได้จริง",
      thaiSignal: "คำค้นไทยมักโยงไป conversion, KPI, ROAS หรือยอดขายปลายทาง",
      globalSignal: "บทความสากลมีตัวอย่าง metric และ benchmark ที่ช่วยให้เนื้อหาน่าเชื่อถือขึ้น",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" KPI", " วัดผล", " metric", " benchmark"])
    },
    {
      title: `เทคนิคทำ ${seedKeyword} ให้เห็นผล`,
      angle: `จัดเทคนิคเป็นลำดับจากพื้นฐานถึงขั้นนำไปใช้จริง พร้อมตัวอย่างจุดที่ควรเริ่มก่อน`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 87,
      whyItMatters: "ได้ทั้ง intent เชิงเรียนรู้และ intent เชิงหาวิธีทำจริงในหน้าเดียว",
      thaiSignal: "คนค้นไทยมักต้องการ checklist หรือขั้นตอนมากกว่านิยามล้วน",
      globalSignal: "best practice ต่างประเทศช่วยยืนยันโครงคิด แต่ต้องแปลให้เข้ากับบริบทธุรกิจไทย",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" เทคนิค", " วิธีทำ", " checklist", " best practice"])
    },
    {
      title: `ข้อผิดพลาดที่ทำให้ ${seedKeyword} ไม่เวิร์ก`,
      angle: `ชี้จุดพลาดที่พบบ่อยพร้อมอธิบายผลกระทบต่อ conversion, lead หรือ revenue`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 85,
      whyItMatters: "ดึงคนที่เคยลองทำแล้วไม่ได้ผล และเพิ่มโอกาสให้เกิด consultation intent",
      thaiSignal: "กลุ่มผู้ใช้งานไทยมักสงสัยว่าแคมเปญหรือเว็บไซต์ไม่เวิร์กเพราะอะไร",
      globalSignal: "case study สากลช่วยเติมมุมมองเรื่อง friction, objection และ UX breakdown",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" ผิดพลาด", " ไม่เวิร์ก", " conversion ลด", " แก้ยังไง"])
    },
    {
      title: `เครื่องมือที่ใช้ทำ ${seedKeyword}`,
      angle: `สรุปเครื่องมือหลัก วิธีเลือกใช้ และวิธีเชื่อมข้อมูลให้ทีมทำงานต่อเนื่อง`,
      searchIntent: "commercial",
      difficulty: "low",
      confidence: 82,
      whyItMatters: "เหมาะกับบทความที่โยงไป product comparison และบริการ implementation ได้ดี",
      thaiSignal: "ผู้ใช้ไทยมักถามหาชื่อเครื่องมือที่เริ่มต้นได้เร็วและไม่ซับซ้อนเกินไป",
      globalSignal: "ต่างประเทศมี listicle และ comparison เยอะ จึงหยิบมา localize ได้ง่าย",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" เครื่องมือ", " software", " tool", " ใช้อะไร"])
    },
    {
      title: `${seedKeyword} เหมาะกับธุรกิจแบบไหน`,
      angle: `อธิบาย use case และตัวอย่างว่าธุรกิจประเภทไหนควรเริ่มจากจุดใดก่อน`,
      searchIntent: "commercial",
      difficulty: "low",
      confidence: 80,
      whyItMatters: "ช่วยคัดกรอง intent ของลูกค้าที่กำลังประเมินว่าเรื่องนี้เกี่ยวกับธุรกิจตัวเองไหม",
      thaiSignal: "คำถามไทยมักมาในรูปแบบเว็บขายของ บริการ หรือ landing page ต้องเริ่มตรงไหน",
      globalSignal: "ตัวอย่าง industry segmentation จากต่างประเทศช่วยยกระดับความครบถ้วนของบทความ",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" ธุรกิจ", " ecommerce", " lead gen", " landing page"])
    }
  ];
}

function buildGenericIdeas(seedKeyword: string): IdeaBlueprint[] {
  return [
    {
      title: `${seedKeyword} คืออะไร`,
      angle: `สรุปความหมาย ประโยชน์ และสิ่งที่ควรรู้ก่อนเริ่มศึกษา ${seedKeyword}`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 90,
      whyItMatters: "เป็นจุดเริ่มต้นที่ครอบ keyword หลักได้กว้างและเหมาะกับบทความ pillar",
      thaiSignal: "คำค้นไทยมักเริ่มจากคำถามนิยามก่อน แล้วค่อยแตกไปคำค้นย่อยตามการใช้งาน",
      globalSignal: "แหล่งสากลช่วยเติมคำนิยาม มาตรฐาน และกรอบคิดที่ชัดขึ้น",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" คืออะไร", " ใช้ทำอะไร", " ทำงานยังไง", " ประโยชน์"])
    },
    {
      title: `วิธีเริ่มต้นกับ ${seedKeyword}`,
      angle: `เรียงขั้นตอนเริ่มต้นแบบไม่ซับซ้อน พร้อมสิ่งที่ควรเตรียมก่อนลงมือ`,
      searchIntent: "problem-solving",
      difficulty: "low",
      confidence: 86,
      whyItMatters: "เหมาะกับ intent เชิงลงมือทำและเปลี่ยนคนอ่านจากการเสพข้อมูลเป็นการปฏิบัติ",
      thaiSignal: "ผู้ใช้ไทยนิยมคอนเทนต์แนว checklist หรือ step-by-step ที่ทำตามได้จริง",
      globalSignal: "คู่แข่งต่างประเทศมักทำ getting started guide ที่นำมาแปลงเป็นบริบทไทยได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" เริ่มต้น", " checklist", " step by step", " มือใหม่"])
    },
    {
      title: `ข้อผิดพลาดที่พบบ่อยเกี่ยวกับ ${seedKeyword}`,
      angle: `รวบรวมความเข้าใจผิดและปัญหาที่ทำให้การใช้งาน ${seedKeyword} ไม่ได้ผล`,
      searchIntent: "problem-solving",
      difficulty: "medium",
      confidence: 84,
      whyItMatters: "ช่วยดึงกลุ่มที่เริ่มทำแล้วแต่ยังติดปัญหา และทำให้บทความมีคุณค่าเชิงแก้ pain point",
      thaiSignal: "คำถามไทยจำนวนมากมาในรูปแบบ 'ทำไมไม่เวิร์ก' หรือ 'แก้ยังไง'",
      globalSignal: "แหล่งสากลมักมี case study หรือ post-mortem ที่ใช้ยืนยันประเด็นได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" ผิดพลาด", " ปัญหา", " ไม่เวิร์ก", " แก้ยังไง"])
    },
    {
      title: `คำถามที่คนค้นบ่อยเกี่ยวกับ ${seedKeyword}`,
      angle: `รวมคำถามยอดฮิตและคำตอบแบบกระชับที่ต่อยอดไป FAQ section ได้ทันที`,
      searchIntent: "informational",
      difficulty: "low",
      confidence: 82,
      whyItMatters: "เหมาะกับการครอบ long-tail และเพิ่มโอกาสให้บทความติดคำถามย่อยจำนวนมาก",
      thaiSignal: "ผู้ใช้ไทยชอบคอนเทนต์ที่ตอบคำถามเป็นภาษาคนค้นจริง",
      globalSignal: "people-also-ask และ community threads สากลช่วยเสริมชุดคำถามได้ดี",
      relatedKeywords: buildKeywordCluster(seedKeyword, [" คำถาม", " FAQ", " คนค้นบ่อย", " ต้องรู้อะไร"])
    }
  ];
}

function buildIdeaSet(seedKeyword: string) {
  const domain = detectDomain(seedKeyword);

  if (domain === "pet") {
    return [...buildPetIdeas(seedKeyword), ...buildGenericIdeas(seedKeyword)];
  }

  if (domain === "marketing") {
    return [...buildMarketingIdeas(seedKeyword), ...buildGenericIdeas(seedKeyword)];
  }

  return buildGenericIdeas(seedKeyword);
}

function inferIntentFromTitle(title: string): TopicIdea["searchIntent"] {
  const normalized = title.toLowerCase();

  if (/ราคา|ซื้อ|รีวิว|เปรียบเทียบ|vs|ดีที่สุด|แนะนำ/.test(title) || /price|review|compare|best/.test(normalized)) {
    return "commercial";
  }

  if (/วิธี|แก้|ทำยังไง|ทำอย่างไร|ปัญหา|ผิดพลาด|ทำไม|ควร|ต้อง/.test(title)) {
    return "problem-solving";
  }

  return "informational";
}

function inferDifficultyFromTitle(title: string): TopicIdea["difficulty"] {
  const normalized = title.toLowerCase();

  if (/advanced|technical|enterprise|architecture/.test(normalized)) {
    return "high";
  }

  if (/เปรียบเทียบ|strategy|framework|ราคา|รีวิว|compare|review|best/.test(title) || /strategy|framework/.test(normalized)) {
    return "medium";
  }

  return "low";
}

function normalizeTopicLine(seedKeyword: string, value: string) {
  const cleaned = value
    .replace(/^[\s\-•*–—]+/g, "")
    .replace(/^\d+[\).\-\s]+/g, "")
    .replace(/^(หัวข้อ|topic|title)\s*[:\-]\s*/i, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/([A-Za-z0-9])([ก-๙])/g, "$1 $2")
    .replace(/([ก-๙])([A-Za-z0-9])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const compact = cleaned
    .replace(/\s+[—–-]\s+.+$/, "")
    .replace(/\s*[:：]\s*(.+)$/, "$1")
    .trim();

  if (!compact || compact.length < 8 || compact.length > 120) {
    return "";
  }

  if (compact.includes(seedKeyword)) {
    return compact;
  }

  return `${seedKeyword} ${compact}`.trim();
}

function buildIdeaBlueprintFromTitle(seedKeyword: string, title: string, index: number): IdeaBlueprint {
  const intent = inferIntentFromTitle(title);
  const difficulty = inferDifficultyFromTitle(title);
  const suffix = title.replace(seedKeyword, "").trim() || "คืออะไร";
  const keywordHints = suffix
    .split(/,|\/| และ | กับ | หรือ | for | and /i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 28)
    .slice(0, 4)
    .map((part) => ` ${part}`);

  return {
    title,
    angle: `อธิบายหัวข้อ "${title}" โดยอิง search intent จริงของผู้ใช้ไทย ใช้ข้อมูลไทยและต่างประเทศรองรับ และพาไปสู่การตัดสินใจหรือการลงมือทำได้จริง`,
    searchIntent: intent,
    difficulty,
    confidence: Math.max(78, 95 - index),
    whyItMatters: `หัวข้อนี้ช่วยขยายจาก seed keyword "${seedKeyword}" ไปสู่ intent ที่เฉพาะขึ้นและนำไปรีเสิร์ชต่อได้ตรงกว่าเดิม`,
    thaiSignal: `หัวข้อนี้ควรใช้ภาษาที่ตรงกับคำถามของผู้ใช้ไทย และเน้นบริบทที่นำไปใช้ได้จริงกับ "${seedKeyword}"`,
    globalSignal: `ใช้แหล่งต่างประเทศเพื่อเติมกรอบคิด คำเทคนิค และ best practices ที่ช่วยยกระดับเนื้อหาเรื่อง "${title}"`,
    relatedKeywords: buildKeywordCluster(seedKeyword, keywordHints.length > 0 ? keywordHints : [" คืออะไร", " วิธี", " เปรียบเทียบ", " รีวิว"])
  };
}

function parseTopicCandidates(seedKeyword: string, response: { answer?: string; results?: Array<{ title?: string }> }) {
  const answerLines = String(response.answer ?? "")
    .split(/\r?\n|•|●|▪|◆/g)
    .map((line) => normalizeTopicLine(seedKeyword, line))
    .filter(Boolean);

  const titleLines = (response.results ?? [])
    .map((result) => normalizeTopicLine(seedKeyword, String(result.title ?? "")))
    .filter(Boolean);

  return dedupe([...answerLines, ...titleLines]);
}

function isOffTopicCandidate(seedKeyword: string, title: string) {
  const normalizedSeed = seedKeyword.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (/seo|marketing|wordpress|backlink|search console|keyword research|google/.test(normalizedSeed)) {
    return false;
  }

  return /seo|marketing|wordpress|backlink|search console|keyword research|google/.test(normalizedTitle);
}

async function generateIdeasFromTavily(seedKeyword: string): Promise<TopicIdea[] | null> {
  try {
    const [thai, global, expansion] = await Promise.all([
      tavilySearch(
        `${seedKeyword} รีวิว วิธีเลือก เปรียบเทียบ ปัญหา คำถามที่พบบ่อย รุ่นไหนดี ใช้ยังไง`,
        {
          country: "thailand",
          maxResults: 8,
          includeAnswer: true
        }
      ),
      tavilySearch(
        `${seedKeyword} buying guide comparison common problems FAQ best practices`,
        {
          country: "united states",
          maxResults: 6,
          includeAnswer: true
        }
      ),
      tavilySearch(
        `The seed keyword is "${seedKeyword}". Return only Thai article topic titles directly related to this keyword. Do not mention SEO, marketing, Google, WordPress, or keyword research unless they are part of the seed keyword itself. Mix how-to, comparison, FAQ, mistakes, buying intent, beginner questions, and problem-solving. One title per line.`,
        {
          country: "thailand",
          maxResults: 4,
          includeAnswer: true
        }
      )
    ]);

    const thaiTitles = dedupe(
      (thai.results ?? []).map((result) => normalizeTopicLine(seedKeyword, String(result.title ?? ""))).filter(Boolean)
    );
    const globalTitles = dedupe(
      (global.results ?? []).map((result) => normalizeTopicLine(seedKeyword, String(result.title ?? ""))).filter(Boolean)
    );
    const expansionTitles = dedupe(
      (expansion.results ?? [])
        .map((result) => normalizeTopicLine(seedKeyword, String(result.title ?? "")))
        .filter(Boolean)
    );

    const aiIdeas = await generateKeywordIdeasWithOpenAi({
      seedKeyword,
      thaiSummary: String(thai.answer ?? ""),
      globalSummary: String(global.answer ?? ""),
      thaiTitles,
      globalTitles: dedupe([...globalTitles, ...expansionTitles]).slice(0, 10)
    }).catch(() => []);

    if (aiIdeas.length >= 8) {
      return aiIdeas.map((idea, index) => ({
        id: crypto.randomUUID(),
        title: normalizeTopicLine(seedKeyword, idea.title),
        angle: trimSentence(idea.angle),
        searchIntent: idea.searchIntent,
        difficulty: idea.difficulty,
        confidence: Math.max(70, Math.min(98, Math.round(idea.confidence || 86) - index)),
        whyItMatters: trimSentence(idea.whyItMatters),
        thaiSignal: trimSentence(idea.thaiSignal),
        globalSignal: trimSentence(idea.globalSignal),
        relatedKeywords: dedupe(
          idea.relatedKeywords.length > 0 ? idea.relatedKeywords : buildKeywordCluster(seedKeyword, [" วิธี", " รีวิว"])
        ).slice(0, 6)
      }));
    }

    const candidates = dedupe([
      ...parseTopicCandidates(seedKeyword, thai),
      ...parseTopicCandidates(seedKeyword, global),
      ...parseTopicCandidates(seedKeyword, expansion)
    ])
      .filter((title) => !isOffTopicCandidate(seedKeyword, title))
      .slice(0, 15);

    if (candidates.length < 8) {
      return null;
    }

    return candidates.slice(0, 12).map((title, index) => ({
      id: crypto.randomUUID(),
      ...buildIdeaBlueprintFromTitle(seedKeyword, title, index)
    }));
  } catch {
    return null;
  }
}

export async function generateIdeas(
  seedKeyword: string,
  provider: ResearchProvider = "tavily"
): Promise<TopicIdea[]> {
  const aiIdeas =
    provider === "dataforseo"
      ? await generateIdeasFromDataForSeo(seedKeyword)
      : await generateIdeasFromTavily(seedKeyword);

  if (aiIdeas && aiIdeas.length > 0) {
    return aiIdeas;
  }

  if (provider === "dataforseo") {
    return buildIdeaSet(seedKeyword)
      .slice(0, 12)
      .map((idea) => ({
        id: crypto.randomUUID(),
        ...idea,
        title: idea.title.replace(/\s*ปี\s*202\d/gi, "").trim()
      }));
  }

  return buildIdeaSet(seedKeyword)
    .slice(0, 12)
    .map((idea) => ({
      id: crypto.randomUUID(),
      ...idea
    }));
}

export async function generateTopicIdeas(seedKeyword: string): Promise<TopicIdea[]> {
  const aiIdeas = await generateIdeasFromTavily(seedKeyword);

  if (aiIdeas && aiIdeas.length > 0) {
    return aiIdeas;
  }

  return buildIdeaSet(seedKeyword)
    .slice(0, 12)
    .map((idea) => ({
      id: crypto.randomUUID(),
      ...idea
    }));
}

function formatSourceLine(source: ResearchSource) {
  return `${source.title} จาก ${source.source} ชี้ว่า ${source.insight}`;
}

function buildFallbackSources(seedKeyword: string, selectedIdea: TopicIdea): ResearchSource[] {
  return [
    ...mockWorkflowJob.research.sources.slice(0, 2),
    {
      region: "TH",
      title: `คำถามจริงจากผู้ใช้ไทยเกี่ยวกับ ${selectedIdea.title}`,
      source: "Thai search and community signals",
      insight: `คำถามภาษาไทยมักโยงจาก ${seedKeyword} ไปสู่ปัญหาเชิงใช้งานจริงและต้องการคำตอบที่นำไปทำต่อได้ทันที`
    },
    {
      region: "Global",
      title: `${selectedIdea.title} best-practice references`,
      source: "Global guide and expert article",
      insight: "ช่วยเติมกรอบคิด มาตรฐาน และคำศัพท์เทคนิคที่ยกระดับความน่าเชื่อถือของบทความ"
    }
  ];
}

export function generateResearch(seedKeyword: string, selectedIdea: TopicIdea): ResearchPack {
  const sources = buildFallbackSources(seedKeyword, selectedIdea);

  return {
    objective: `รวบรวมข้อมูลไทยและต่างประเทศเพื่อเขียนบทความหัวข้อ "${selectedIdea.title}" ให้ตอบ search intent ชัดและใช้งานได้จริง`,
    audience: `ผู้อ่านที่ค้นหาเรื่อง ${seedKeyword} และต้องการคำตอบที่เชื่อถือได้ เข้าใจง่าย และนำไปตัดสินใจหรือแก้ปัญหาต่อได้`,
    gaps: [
      `คอนเทนต์จำนวนมากยังตอบคำถามเรื่อง ${selectedIdea.title} แบบกว้างเกินไปและไม่เชื่อมกับการใช้งานจริง`,
      "หลายบทความมีข้อมูลอ้างอิงแต่ยังไม่แปลความหมายให้เข้ากับภาษาคนอ่านไทย",
      `ยังมีช่องว่างในการสรุปคำตอบแบบครบทั้งภาพรวม เหตุผล และสิ่งที่ผู้อ่านควรทำต่อหลังอ่านเรื่อง ${selectedIdea.title}`
    ],
    sources
  };
}

function makeSeoTitle(title: string) {
  if (title.includes("คืออะไร")) {
    return title;
  }

  if (title.includes("?")) {
    return `${title} พร้อมคำอธิบายที่ใช้งานได้จริง`;
  }

  return `${title} คืออะไร และควรเริ่มจากตรงไหน`;
}

function buildOutline(
  seedKeyword: string,
  selectedIdea: TopicIdea,
  research: ResearchPack,
  sectionCount = 3
) {
  const thaiSource = research.sources.find((source) => source.region === "TH");
  const globalSource = research.sources.find((source) => source.region === "Global");

  return [
    `${selectedIdea.title}: คำตอบสั้นและภาพรวมที่ควรรู้`,
    `สิ่งที่ต้องเข้าใจก่อนลงมือเรื่อง ${seedKeyword}`,
    thaiSource ? `สิ่งที่แหล่งไทยสะท้อนเกี่ยวกับ ${selectedIdea.title}` : `มุมมองแบบไทยที่ควรเข้าใจเกี่ยวกับ ${selectedIdea.title}`,
    globalSource ? `สิ่งที่แหล่งต่างประเทศใช้ยืนยันประเด็นนี้` : `แนวทางจากต่างประเทศที่ช่วยให้เนื้อหาครบขึ้น`,
    `วิธีนำข้อมูลเรื่อง ${selectedIdea.title} ไปใช้จริงแบบไม่เสี่ยง`,
    `คำถามที่คนค้นต่อจากหัวข้อนี้`
  ].slice(0, Math.max(1, Math.min(sectionCount, 3)));
}

export function generateBrief(
  seedKeyword: string,
  selectedIdea: TopicIdea,
  research: ResearchPack,
  options?: { sectionCount?: number }
): ContentBrief {
  const settings = normalizeGenerationSettings({
    sectionCount: options?.sectionCount
  });
  const seoTitle = makeSeoTitle(selectedIdea.title);
  const metaDescription = trimSentence(
    [
      `สรุป ${selectedIdea.title} จากข้อมูลไทยและต่างประเทศ`,
      selectedIdea.angle,
      "พร้อมข้อควรระวัง วิธีนำไปใช้ และคำถามที่คนค้นต่อจริง"
    ].join(" ")
  );

  return {
    title: seoTitle,
    slug: slugify(selectedIdea.title),
    metaTitle: seoTitle,
    metaDescription,
    audience: research.audience,
    angle: selectedIdea.angle,
    publishStatus: "draft",
    categoryIds: [],
    tagIds: [],
    featuredImageUrl: "",
    outline: buildOutline(seedKeyword, selectedIdea, research, settings.sectionCount),
    faqs: [
      `${seedKeyword} ต้องเช็กอะไรเป็นอย่างแรก`,
      `${selectedIdea.title} ควรระวังความเข้าใจผิดเรื่องไหน`,
      `มีสัญญาณอะไรที่บอกว่าควรรีบจัดการเรื่อง ${selectedIdea.title}`
    ],
    internalLinks: dedupe([
      `คู่มือพื้นฐานเกี่ยวกับ ${seedKeyword}`,
      `วิธีดูแล ${seedKeyword} สำหรับมือใหม่`,
      ...selectedIdea.relatedKeywords.slice(0, 3)
    ])
  };
}

function pickSource(sources: ResearchSource[], region: "TH" | "Global", fallbackIndex: number) {
  return (
    sources.find((source) => source.region === region) ??
    sources[fallbackIndex] ??
    sources[0] ?? {
      region,
      title: "Research source",
      source: "Search summary",
      insight: "ยังไม่มีข้อมูลเพิ่มเติม"
    }
  );
}

function buildSectionBody(input: {
  heading: string;
  index: number;
  seedKeyword: string;
  brief: ContentBrief;
  research: ResearchPack;
}) {
  const thaiSource = pickSource(input.research.sources, "TH", 0);
  const globalSource = pickSource(input.research.sources, "Global", 1);
  const gap = input.research.gaps[input.index % Math.max(1, input.research.gaps.length)] ?? "";

  if (input.index === 0) {
    return [
      `${input.heading} ควรถูกเปิดด้วยคำตอบที่ตรงประเด็นก่อนว่าเรื่องนี้หมายถึงอะไร สำคัญต่อผู้อ่านอย่างไร และเหตุใดหลายคนจึงเข้าใจคลาดเคลื่อนเมื่อค้นคำว่า ${input.seedKeyword}.`,
      `จากข้อมูลรีเสิร์ช สิ่งที่ควรเน้นคือ ${input.brief.angle.toLowerCase()} โดยไม่สรุปแบบกว้างเกินไป แต่ต้องพาผู้อ่านเห็นทั้งภาพรวม เหตุผล และสิ่งที่ควรเช็กต่อทันที.`,
      `แหล่งไทยอย่าง ${formatSourceLine(thaiSource)} ขณะเดียวกันแหล่งต่างประเทศอย่าง ${formatSourceLine(globalSource)} ช่วยยืนยันว่าบทความควรตอบทั้งมุม practical และมุมมาตรฐานที่น่าเชื่อถือไปพร้อมกัน.`
    ].join("\n\n");
  }

  if (input.index === 1) {
    return [
      `ก่อนลงมือ ผู้อ่านควรเข้าใจก่อนว่า ${input.research.objective} ดังนั้นเนื้อหาช่วงนี้ไม่ควรรีบข้ามไปที่คำตอบสำเร็จรูป แต่ต้องวางพื้นฐานให้ชัดว่าปัจจัยใดเป็นตัวกำหนดผลลัพธ์จริง.`,
      `ประเด็นที่มักทำให้คนสับสนคือ ${gap} ถ้าไม่อธิบายส่วนนี้ให้ชัด บทความจะดูเหมือนแค่แปลข้อมูลมาเรียง แต่ไม่ช่วยให้คนอ่านตัดสินใจหรือแก้ปัญหาได้จริง.`,
      `แนวทางที่เหมาะคือใช้ภาษาง่ายแบบไทย แต่ยังคงชื่อแหล่งอ้างอิงหรือคำเทคนิคอังกฤษเฉพาะจุดที่ช่วยเพิ่มความแม่นและความน่าเชื่อถือของเนื้อหา.`
    ].join("\n\n");
  }

  if (input.index === 2) {
    return [
      `ถ้ามองจากฝั่งไทย จะเห็นรูปแบบคำถามชัดว่าผู้อ่านไม่ได้อยากได้ทฤษฎียาวอย่างเดียว แต่ต้องการคำตอบที่โยงกับสถานการณ์จริงในบ้านเรา.`,
      `${formatSourceLine(thaiSource)} จุดนี้ช่วยให้บทความพูดด้วยภาษาที่ตรงกับสิ่งที่คนค้นจริง และลดความรู้สึกว่าเนื้อหาเขียนมาเพื่อ SEO อย่างเดียว.`,
      `ดังนั้น section นี้ควรเล่าให้เห็นว่าคนไทยมักเจอปัญหาหรือเข้าใจผิดตรงไหนบ้าง พร้อมแปลความหมายของข้อมูลให้กลายเป็นคำแนะนำที่ทำต่อได้ทันที.`
    ].join("\n\n");
  }

  if (input.index === 3) {
    return [
      `เมื่อขยับไปดูข้อมูลต่างประเทศ จุดที่ได้เพิ่มคือกรอบคิดที่เป็นระบบและคำอธิบายที่ละเอียดกว่าในเชิงมาตรฐาน.`,
      `${formatSourceLine(globalSource)} การอ้างอิงลักษณะนี้ไม่ได้มีไว้เพื่อแค่เพิ่มชื่อแหล่ง แต่ช่วยยืนยันว่าข้อสรุปในบทความไม่ได้มาจากความเห็นลอย ๆ.`,
      `สิ่งสำคัญคือไม่คัดข้อมูลสากลมาใช้ตรง ๆ ทั้งหมด แต่ต้องเลือกเฉพาะส่วนที่สอดคล้องกับบริบทผู้อ่านไทย แล้วเรียบเรียงใหม่ให้เป็นภาษาที่อ่านลื่นและเข้าใจทันที.`
    ].join("\n\n");
  }

  if (input.index === 4) {
    return [
      `หลังจากอธิบายภาพรวมและหลักคิดแล้ว บทความควรพาผู้อ่านไปสู่สิ่งที่ทำได้จริง เช่น ขั้นตอนเช็กเบื้องต้น วิธีลดความเสี่ยง หรือสิ่งที่ควรหลีกเลี่ยง.`,
      `หัวใจของส่วนนี้คือทำให้คนอ่านรู้ว่า หลังอ่านจบแล้วควรทำอะไรต่อ ไม่ว่าจะเป็นการตรวจสอบข้อมูลเพิ่มเติม การเปลี่ยนวิธีใช้งาน หรือการปรับพฤติกรรมบางอย่างที่เกี่ยวกับ ${input.seedKeyword}.`,
      `การสรุปเป็นลำดับขั้นพร้อมเหตุผลจะช่วยให้บทความดูมีน้ำหนักมากกว่าการให้ checklist ล้วน ๆ และยังเพิ่มโอกาสให้เกิด conversion หรือการไปอ่านบทความภายในต่อด้วย.`
    ].join("\n\n");
  }

  return [
    `ช่วงท้ายของบทความควรเก็บคำถามที่คนมักค้นต่อจากหัวข้อนี้ เพื่อช่วยปิดข้อสงสัยและครอบ long-tail keyword เพิ่มเติม.`,
    `คำถามที่เหมาะควรต่อยอดจาก ${input.seedKeyword} และ ${input.brief.title} โดยหลีกเลี่ยง FAQ ที่กว้างเกินไปหรือไม่เกี่ยวกับสิ่งที่ผู้อ่านกำลังตัดสินใจอยู่จริง.`,
    `เมื่อวาง FAQ ให้ตรง intent บทความจะดูครบขึ้นทั้งในมุมผู้อ่านและมุม SEO และยังช่วยเชื่อม internal links ไปยังบทความรองหรือหน้าบริการที่เกี่ยวข้องได้เป็นธรรมชาติ.`
  ].join("\n\n");
}

export function generateDraft(
  seedKeyword: string,
  brief: ContentBrief,
  research: ResearchPack,
  options?: { sectionCount?: number }
): ArticleDraft {
  const settings = normalizeGenerationSettings({
    sectionCount: options?.sectionCount
  });
  const intro = [
    `${brief.title} เป็นคำถามที่ผู้อ่านจำนวนมากค้นหาเพราะต้องการคำตอบที่ชัด ใช้งานได้ และมีข้อมูลรองรับมากกว่าคำแนะนำสั้น ๆ ที่กระจายอยู่หลายแหล่ง.`,
    `บทความนี้จึงถอดจากรีเสิร์ชจริงทั้งฝั่งไทยและต่างประเทศ เพื่อช่วยให้ผู้อ่านเข้าใจภาพรวม เห็นจุดที่ต้องระวัง และรู้ว่าควรทำอะไรต่ออย่างเป็นลำดับ.`,
    `เป้าหมายไม่ใช่แค่ตอบว่าใช่หรือไม่ใช่ แต่ทำให้เรื่อง ${seedKeyword} ถูกอธิบายแบบอ่านแล้วตัดสินใจหรือปรับใช้ต่อได้ทันที.`
  ].join("\n\n");

  const sections = brief.outline.slice(0, settings.sectionCount).map((heading, index) => ({
    heading,
    body: buildSectionBody({
      heading,
      index,
      seedKeyword,
      brief,
      research
    })
  }));

  const conclusion = [
    `ถ้าสรุปให้สั้นที่สุด เรื่อง ${seedKeyword} ไม่ควรถูกอธิบายแค่ในมุมคำตอบเดียว แต่ต้องมองทั้งสาเหตุ บริบท และวิธีนำข้อมูลไปใช้จริง.`,
    `เมื่อบทความเรียงจากคำตอบสั้น ภาพรวม ข้อมูลไทย ข้อมูลต่างประเทศ ไปจนถึงข้อปฏิบัติและ FAQ ผู้อ่านจะรู้สึกว่าข้อมูลครบและน่าเชื่อถือกว่าบทความที่อาศัยสูตรเดิมซ้ำ ๆ.`,
    `ก่อนเผยแพร่ ควรตรวจความสอดคล้องของคำศัพท์ โทนภาษา และ internal links อีกครั้ง เพื่อให้บทความพร้อมทั้งในมุม SEO และมุมการใช้งานจริงของผู้อ่าน.`
  ].join("\n\n");

  return {
    intro,
    sections,
    conclusion
  };
}

export async function buildNewJob(
  seedKeyword: string,
  client: string,
  provider: ResearchProvider = "tavily"
): Promise<WorkflowJob> {
  const ideas = await generateIdeas(seedKeyword, provider);

  return {
    id: crypto.randomUUID(),
    client,
    seedKeyword,
    researchProvider: provider,
    stage: "idea_pool",
    selectedIdeaId: "",
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
    images: [],
    facebook: {
      caption: "",
      hashtags: [],
      selectedImageId: "",
      status: "draft"
    }
  };
}
