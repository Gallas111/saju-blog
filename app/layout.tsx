import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import ScrollTracker from "@/components/ScrollTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: "사주보까 블로그 — 운세·사주·꿈해몽 정보",
    template: "%s | 사주보까 블로그",
  },
  description:
    "사주, 운세, 꿈 해몽, 타로, 궁합, 일주론 등 운세 정보를 매일 업데이트합니다. AI 기반 사주 분석 서비스 사주보까의 공식 블로그.",
  metadataBase: new URL("https://www.sajubokastory.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon" }],
  },
  keywords: ["사주", "타로", "꿈해몽", "운세", "궁합", "관상", "손금", "토정비결", "띠별 운세", "오늘의 운세"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "사주보까 블로그",
    images: [
      {
        url: "/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "사주보까 블로그 — 운세·사주·꿈해몽 정보",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "사주보까 블로그 — 운세·사주·꿈해몽 정보",
    description:
      "사주, 운세, 꿈 해몽, 타로, 궁합, 일주론 등 운세 정보를 매일 업데이트합니다.",
    images: ["/images/og-default.png"],
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
      // Bing Webmaster: https://www.bing.com/webmasters → 사이트 추가 → 메타 태그 코드 입력
      // "msvalidate.01": "BING_CODE_HERE",
    },
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  other: {
    "google-adsense-account": "ca-pub-1022869499967960",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1022869499967960"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} antialiased min-h-screen flex flex-col`}
      >
        <Script
          id="website-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "사주보까",
              url: "https://www.sajubokastory.com",
              potentialAction: {
                "@type": "SearchAction",
                target:
                  "https://www.sajubokastory.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {children}
        <ScrollTracker />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-P8GS2YYFC2"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-P8GS2YYFC2');`}
        </Script>
      </body>
    </html>
  );
}
