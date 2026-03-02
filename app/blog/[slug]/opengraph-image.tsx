import { ImageResponse } from "next/og";
import { getPostBySlug, getAllSlugs } from "@/lib/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  const title = post?.title ?? "사주보까 블로그";
  const category = post?.category ?? "";
  const icon = post?.icon ?? "🔮";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f1729 0%, #1a2332 50%, #0f1729 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "900px",
          }}
        >
          <div style={{ fontSize: "80px", marginBottom: "20px" }}>{icon}</div>
          {category && (
            <div
              style={{
                fontSize: "20px",
                color: "#8b5cf6",
                marginBottom: "16px",
                padding: "4px 16px",
                borderRadius: "9999px",
                border: "1px solid #8b5cf6",
              }}
            >
              {category}
            </div>
          )}
          <div
            style={{
              fontSize: "42px",
              fontWeight: 700,
              color: "#f0d78c",
              lineHeight: 1.3,
              marginBottom: "24px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🔮</span>
            <span>사주보까 블로그</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
