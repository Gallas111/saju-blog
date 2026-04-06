import type { Metadata } from "next";
import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "검색",
  description: "사주보까 블로그에서 원하는 운세 정보를 검색하세요.",
  robots: { index: false, follow: false },
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}
