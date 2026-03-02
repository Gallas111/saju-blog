import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "사주보까 블로그 — 운세·사주·꿈해몽 정보",
    template: "%s | 사주보까 블로그",
  },
  description:
    "사주, 운세, 꿈 해몽, 타로, 궁합, 일주론 등 운세 정보를 매일 업데이트합니다. AI 기반 사주 분석 서비스 사주보까의 공식 블로그.",
  metadataBase: new URL("https://www.sajubokastory.com"),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "사주보까 블로그",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "lOwTFjWBnR7_zMhcWWb5ZX_XOwqP8ou95e59KK5yMug",
    other: {
      "naver-site-verification": "2a810da80d41904bda93f7dba12e29196a8c243b",
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
