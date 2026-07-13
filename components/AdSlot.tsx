"use client";

import { useEffect } from "react";

interface AdSlotProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle";
  layout?: "in-article";
  layoutKey?: string;
  responsive?: boolean;
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

export default function AdSlot({
  slot,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  minHeight = 250,
  className,
  style,
  label = "광고",
}: AdSlotProps) {
  useEffect(() => {
    if (!slot) return;
    try {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || [];
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({});
    } catch {
      // 스크립트 로드 전이면 무음
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div
      className={className}
      style={{
        margin: "32px 0",
        textAlign: "center",
        // CLS 방지: 광고가 더 크게 렌더되거나 미충족으로 붕괴해도
        // 예약 높이를 컨테이너 레벨에서 유지해 콘텐츠 이동(레이아웃 시프트)을 막는다.
        minHeight: `${minHeight}px`,
        ...style,
      }}
      aria-label={label}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: `${minHeight}px` }}
        data-ad-client="ca-pub-1022869499967960"
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { "data-ad-layout": layout } : {})}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        {...(responsive ? { "data-full-width-responsive": "true" } : {})}
      />
    </div>
  );
}
