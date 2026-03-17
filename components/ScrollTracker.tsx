"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const THRESHOLDS = [25, 50, 75, 100];
const MIN_TIME_ON_PAGE_MS = 10_000; // 10초 이상 체류 후에만 이벤트 발생

export default function ScrollTracker() {
  useEffect(() => {
    const fired = new Set<number>();
    const pending = new Set<number>();
    const loadTime = Date.now();
    let enabled = false;

    function firePending() {
      for (const t of pending) {
        fired.add(t);
        window.gtag?.("event", "scroll_depth", {
          event_category: "Engagement",
          event_label: `${t}%`,
          value: t,
          page_path: window.location.pathname,
        });
      }
      pending.clear();
    }

    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const percent = Math.round((scrollTop / docHeight) * 100);

      for (const t of THRESHOLDS) {
        if (percent >= t && !fired.has(t) && !pending.has(t)) {
          if (enabled) {
            fired.add(t);
            window.gtag?.("event", "scroll_depth", {
              event_category: "Engagement",
              event_label: `${t}%`,
              value: t,
              page_path: window.location.pathname,
            });
          } else {
            pending.add(t);
          }
        }
      }
    }

    // 10초 후 활성화 — 빠른 이탈자의 스크롤 이벤트를 차단하여 정확한 이탈률 측정
    const timer = setTimeout(() => {
      enabled = true;
      firePending();
    }, MIN_TIME_ON_PAGE_MS - (Date.now() - loadTime));

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
