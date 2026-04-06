import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "사주보까 블로그 — 운세·사주·꿈해몽 정보";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #080c18 0%, #0f0a28 50%, #080c18 100%)",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* 배경 글로우 */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,92,191,0.15) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* 상단 배지 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 24px",
            borderRadius: "999px",
            border: "1px solid rgba(201,168,76,0.4)",
            color: "#c9a84c",
            fontSize: "18px",
            letterSpacing: "0.2em",
            marginBottom: "32px",
            background: "rgba(201,168,76,0.06)",
          }}
        >
          ✦ 운세 · 사주 · 명리학 블로그 ✦
        </div>

        {/* 수정구 */}
        <div style={{ fontSize: "100px", marginBottom: "24px", lineHeight: 1 }}>
          🔮
        </div>

        {/* 사이트 이름 */}
        <div
          style={{
            fontSize: "84px",
            fontWeight: "bold",
            background: "linear-gradient(135deg, #e8c96a 0%, #c9a84c 50%, #a07830 100%)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-0.02em",
            marginBottom: "20px",
            lineHeight: 1,
          }}
        >
          사주보까 블로그
        </div>

        {/* 슬로건 */}
        <div
          style={{
            fontSize: "32px",
            color: "#c8b89a",
            fontWeight: "300",
            letterSpacing: "0.05em",
            marginBottom: "40px",
          }}
        >
          매일 업데이트되는 운세 정보
        </div>

        {/* 서비스 태그 */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "20px",
            color: "#5a4a38",
            letterSpacing: "0.15em",
          }}
        >
          <span>일주론</span>
          <span style={{ color: "#3a2a18" }}>·</span>
          <span>꿈해몽</span>
          <span style={{ color: "#3a2a18" }}>·</span>
          <span>운세</span>
          <span style={{ color: "#3a2a18" }}>·</span>
          <span>타로</span>
          <span style={{ color: "#3a2a18" }}>·</span>
          <span>사주</span>
          <span style={{ color: "#3a2a18" }}>·</span>
          <span>궁합</span>
        </div>

        {/* 하단 도메인 */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            right: "48px",
            fontSize: "22px",
            color: "#3a2a18",
            letterSpacing: "0.05em",
          }}
        >
          sajubokastory.com
        </div>
      </div>
    ),
    { ...size }
  );
}
