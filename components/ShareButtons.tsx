"use client";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다!");
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      alert("링크가 복사되었습니다!");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted">공유하기:</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-9 h-9 flex items-center justify-center bg-card-bg border border-card-border rounded-lg text-muted hover:text-gold hover:border-gold transition-colors"
        aria-label="Twitter 공유"
      >
        𝕏
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-9 h-9 flex items-center justify-center bg-card-bg border border-card-border rounded-lg text-muted hover:text-gold hover:border-gold transition-colors"
        aria-label="Facebook 공유"
      >
        f
      </a>
      <button
        onClick={copyLink}
        className="w-9 h-9 flex items-center justify-center bg-card-bg border border-card-border rounded-lg text-muted hover:text-gold hover:border-gold transition-colors cursor-pointer"
        aria-label="링크 복사"
      >
        🔗
      </button>
    </div>
  );
}
