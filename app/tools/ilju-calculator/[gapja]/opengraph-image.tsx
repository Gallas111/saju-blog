import { ImageResponse } from "next/og";
import { GAPJA_LIST, getGapjaBySlug } from "@/lib/ilju";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return GAPJA_LIST.map((g) => ({ gapja: g.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ gapja: string }>;
}) {
  const { gapja: slug } = await params;
  const g = getGapjaBySlug(slug);

  const name = g ? `${g.name}일주` : "일주 계산기";
  const hanja = g?.hanja ?? "";
  const image = g?.image ?? "생년월일로 내 일주 찾기";
  const badges = g
    ? [
        `일간 ${g.stem.ko}${g.stem.element} · ${g.stem.yinYang}`,
        `일지 ${g.branch.ko} · ${g.branch.animal}`,
      ]
    : [];

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
          background:
            "linear-gradient(135deg, #0f1729 0%, #1a2332 50%, #0f1729 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "980px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              color: "#8b5cf6",
              marginBottom: "24px",
              padding: "6px 20px",
              borderRadius: "9999px",
              border: "1px solid #8b5cf6",
            }}
          >
            📅 일주 계산기
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "20px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{ fontSize: "96px", fontWeight: 700, color: "#f0d78c" }}
            >
              {name}
            </div>
            {hanja && (
              <div style={{ fontSize: "56px", color: "#d4a853" }}>{hanja}</div>
            )}
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#e8e6e3",
              marginBottom: "28px",
            }}
          >
            {`“${image}”`}
          </div>
          {badges.length > 0 && (
            <div style={{ display: "flex", gap: "14px", marginBottom: "36px" }}>
              {badges.map((b) => (
                <div
                  key={b}
                  style={{
                    fontSize: "22px",
                    color: "#94a3b8",
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    border: "1px solid #2a3a4e",
                    background: "#1a2332",
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              fontSize: "20px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🔮</span>
            <span>사주보까 블로그 · sajubokastory.com</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
