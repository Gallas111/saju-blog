"use client";

import { useState } from "react";

interface ToolShareProps {
  url: string;
  title: string;
  description?: string;
}

export default function ToolShare({ url, title, description }: ToolShareProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description ?? title, url });
        return;
      } catch {
        // 사용자가 공유 시트를 닫은 경우 등 — 무시
        return;
      }
    }
    // 데스크탑 등 Web Share 미지원 환경은 링크 복사로 대체
    copyLink();
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-sm text-muted mr-1">결과 공유:</span>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 bg-card-bg border border-card-border rounded-full px-4 py-2 text-sm text-muted hover:text-gold hover:border-gold transition-colors cursor-pointer"
        aria-label="결과 링크 복사"
      >
        🔗 {copied ? "복사됨!" : "링크 복사"}
      </button>
      <button
        onClick={nativeShare}
        className="inline-flex items-center gap-1.5 bg-card-bg border border-card-border rounded-full px-4 py-2 text-sm text-muted hover:text-gold hover:border-gold transition-colors cursor-pointer"
        aria-label="카카오톡 등으로 공유"
      >
        💬 카카오톡·SNS 공유
      </button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-9 h-9 bg-card-bg border border-card-border rounded-full text-muted hover:text-gold hover:border-gold transition-colors"
        aria-label="X(트위터)에 공유"
      >
        𝕏
      </a>
    </div>
  );
}
