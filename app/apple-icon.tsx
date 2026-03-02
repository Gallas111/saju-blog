import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #131028 0%, #080c18 100%)",
          borderRadius: "36px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 골드 테두리 */}
        <div
          style={{
            position: "absolute",
            inset: "0",
            borderRadius: "36px",
            border: "2px solid rgba(201,168,76,0.5)",
          }}
        />

        {/* 수정구 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "-10px",
          }}
        >
          {/* 수정구 본체 */}
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 32%, #9b7ee0 0%, #4a2d8a 60%, #1a0f35 100%)",
              border: "2px solid rgba(201,168,76,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxShadow: "0 0 30px rgba(124,92,191,0.3)",
            }}
          >
            {/* 중앙 펜 */}
            <div
              style={{
                fontSize: "40px",
                color: "#e8c96a",
                fontFamily: "serif",
                textShadow: "0 0 12px rgba(232,201,106,0.6)",
                marginTop: "8px",
              }}
            >
              ✎
            </div>
          </div>

          {/* 받침대 */}
          <div
            style={{
              width: "70px",
              height: "18px",
              background:
                "linear-gradient(180deg, rgba(201,168,76,0.7) 0%, rgba(201,168,76,0.4) 100%)",
              borderRadius: "0 0 12px 12px",
              marginTop: "-6px",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
