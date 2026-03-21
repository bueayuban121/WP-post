export type ArticleImage = {
  src: string;
  alt: string;
  caption: string;
  placement: string;
};

const imageThemes = {
  health: [
    "/article-images/goldfish-health-1.svg",
    "/article-images/goldfish-health-2.svg",
    "/article-images/goldfish-health-3.svg"
  ],
  water: [
    "/article-images/goldfish-water-1.svg",
    "/article-images/goldfish-water-2.svg",
    "/article-images/goldfish-water-3.svg"
  ],
  food: [
    "/article-images/goldfish-food-1.svg",
    "/article-images/goldfish-food-2.svg",
    "/article-images/goldfish-food-3.svg"
  ],
  shared: ["/article-images/goldfish-detail-1.svg", "/article-images/goldfish-detail-2.svg"]
} as const;

function getTheme(title: string) {
  if (title.includes("โรค")) return "health" as const;
  if (title.includes("น้ำ") || title.toLowerCase().includes("ph")) return "water" as const;
  return "food" as const;
}

export function getArticleImages(title: string): ArticleImage[] {
  const theme = getTheme(title);
  const base = imageThemes[theme];

  return [
    {
      src: base[0],
      alt: `ภาพเปิดบทความสำหรับหัวข้อ ${title}`,
      caption: "ภาพเปิดบทความ",
      placement: "ก่อนบทนำ"
    },
    {
      src: base[1],
      alt: `ภาพประกอบหัวข้อหลักของบทความ ${title}`,
      caption: "ภาพประกอบหัวข้อหลัก",
      placement: "หลัง H2 แรก"
    },
    {
      src: base[2],
      alt: `ภาพอธิบายวิธีดูแลสำหรับหัวข้อ ${title}`,
      caption: "ภาพอธิบายวิธีดูแล",
      placement: "หลัง H2 ที่สอง"
    },
    {
      src: imageThemes.shared[0],
      alt: `ภาพคั่นกลางบทความ ${title}`,
      caption: "ภาพคั่นกลางบทความ",
      placement: "ช่วงกลางบทความ"
    },
    {
      src: imageThemes.shared[1],
      alt: `ภาพสรุปท้ายบทความ ${title}`,
      caption: "ภาพสรุปท้ายบทความ",
      placement: "ก่อนสรุป"
    }
  ];
}
