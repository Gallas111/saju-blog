"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getIlju, type Gapja } from "@/lib/ilju";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const MIN_YEAR = 1920;
const MAX_YEAR = 2026;

export default function IljuCalculator() {
  const [year, setYear] = useState(1995);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [result, setResult] = useState<Gapja | null>(null);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) list.push(y);
    return list;
  }, []);

  const daysInMonth = useMemo(
    () => new Date(year, month, 0).getDate(),
    [year, month]
  );

  function handleCalculate() {
    const d = Math.min(day, daysInMonth);
    const gapja = getIlju(year, month, d);
    setResult(gapja);
    window.gtag?.("event", "ilju_calculate", {
      event_category: "Tool",
      event_label: gapja.name,
      birth_year: year,
    });
  }

  const selectClass =
    "flex-1 min-w-0 bg-background border border-card-border rounded-lg px-3 py-3 text-foreground text-base focus:outline-none focus:border-gold transition-colors";

  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-7">
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="ilju-year"
            className="block text-sm font-semibold text-gold-light mb-2"
          >
            생년월일 (양력)
          </label>
          <div className="flex gap-2">
            <select
              id="ilju-year"
              aria-label="출생 연도"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={selectClass}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              aria-label="출생 월"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={selectClass}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <select
              aria-label="출생 일"
              value={Math.min(day, daysInMonth)}
              onChange={(e) => setDay(Number(e.target.value))}
              className={selectClass}
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                (d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <button
          onClick={handleCalculate}
          className="w-full bg-gold hover:bg-gold-light text-background font-bold py-3.5 rounded-xl text-lg transition-colors cursor-pointer"
        >
          🔮 내 일주 확인하기
        </button>

        <p className="text-xs text-muted leading-relaxed">
          ⏰ 밤 11시(23시) 이후에 태어났다면 명리학 관법에 따라{" "}
          <strong className="text-gold-light">다음 날 일주</strong>로 보기도
          합니다(야자시·조자시 논쟁). 23시~자정 사이 출생이라면 다음 날
          날짜로도 함께 확인해 보세요.
        </p>
      </div>

      {result && (
        <div className="mt-6 rounded-xl border border-gold/40 bg-background p-5 sm:p-6 text-center">
          <p className="text-sm text-muted mb-1">
            {year}년 {month}월 {Math.min(day, daysInMonth)}일생의 일주
          </p>
          <p className="text-3xl sm:text-4xl font-bold text-gold-light mb-1">
            {result.name}일주{" "}
            <span className="text-gold">({result.hanja})</span>
          </p>
          <p className="text-sm text-muted mb-3">“{result.image}”</p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="text-xs bg-purple/20 text-purple px-3 py-1 rounded-full">
              일간 {result.stem.ko}
              {result.stem.element} · {result.stem.yinYang}
            </span>
            <span className="text-xs bg-purple/20 text-purple px-3 py-1 rounded-full">
              일지 {result.branch.ko}({result.branch.animal}) ·{" "}
              {result.branch.element}
            </span>
            {result.stem.keywords.map((k) => (
              <span
                key={k}
                className="text-xs bg-card-bg border border-card-border text-muted px-3 py-1 rounded-full"
              >
                #{k}
              </span>
            ))}
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-5 text-left sm:text-center">
            {result.stem.desc.split(". ")[0]}.
          </p>
          <Link
            href={`/tools/ilju-calculator/${result.slug}`}
            className="inline-block bg-gold hover:bg-gold-light text-background font-bold px-8 py-3 rounded-full transition-colors"
          >
            {result.name}일주 상세 풀이 보기 →
          </Link>
        </div>
      )}
    </div>
  );
}
