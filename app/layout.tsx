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
      // TODO: Add Bing Webmaster verification code
      // "msvalidate.01": "YOUR_BING_VERIFICATION_CODE",
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
