import type { PostMeta } from "./posts";

const ORGANIZATION = {
  "@type": "Organization" as const,
  name: "사주보까",
  alternateName: "사주보까 스토리",
  url: "https://www.sajubokastory.com",
  logo: {
    "@type": "ImageObject" as const,
    url: "https://www.sajubokastory.com/icon.png",
    width: 512,
    height: 512,
  },
  sameAs: ["https://www.sajuboka.com"],
  description:
    "동양철학·명리학 연구진이 전통 사주 이론과 현대 해석을 바탕으로 운세 정보를 발행하는 콘텐츠 매체.",
};

export function generateArticleSchema(post: PostMeta, url: string) {
  const imageUrl = `https://www.sajubokastory.com/blog/${post.slug}/opengraph-image`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: imageUrl,
    datePublished: post.date,
    dateModified: post.dateModified ?? post.date,
    inLanguage: "ko",
    articleSection: post.category,
    author: {
      ...ORGANIZATION,
      "@id": "https://www.sajubokastory.com/about",
    },
    publisher: ORGANIZATION,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: post.tags.join(", "),
    isAccessibleForFree: true,
  };
}

export function generateFaqSchema(
  faqs: { question: string; answer: string }[]
) {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    ...ORGANIZATION,
    "@id": "https://www.sajubokastory.com/#organization",
    foundingDate: "2024",
    knowsAbout: [
      "사주",
      "명리학",
      "운세",
      "꿈해몽",
      "타로",
      "관상",
      "궁합",
      "오행",
      "절기",
      "작명",
    ],
  };
}
