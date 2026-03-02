const KOREAN_CHARS_PER_MINUTE = 500;

export function calculateReadingTime(content: string): number {
  const cleaned = content
    .replace(/---[\s\S]*?---/, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[#*`~\[\]()>|_-]/g, "")
    .trim();

  const charCount = cleaned.length;
  const minutes = Math.ceil(charCount / KOREAN_CHARS_PER_MINUTE);
  return Math.max(1, minutes);
}
