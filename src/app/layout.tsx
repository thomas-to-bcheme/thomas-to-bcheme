import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import 'katex/dist/katex.min.css';
import MotionProvider from '@/components/layout/MotionProvider';
import { RECOGNITION_ITEMS, PRESS_FEATURES } from '@/data/credentials';
import {
  SITE_OWNER_NAME,
  SITE_URL,
  GITHUB_PROFILE_URL,
  LINKEDIN_URL,
  YOUTUBE_URL,
} from '@/constants/site';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚀 IMPROVED: Professional SEO & Branding Metadata
export const metadata: Metadata = {
  title: {
    template: "%s | Thomas To",
    default: "Thomas To | Agentic Systems & Bio-Compute Architect", // The main title seen on Google
  },
  description: "Senior Fullstack Engineer bridging biological reality with cloud autonomy. Specializing in Unsupervised Machine Learning, RAG Pipelines, and Biochemical Engineering.",
  keywords: [
    "Thomas To", 
    "Fullstack Engineer", 
    "Agentic AI", 
    "Biochemical Engineering", 
    "RAG", 
    "Next.js", 
    "Python", 
    "Snowflake"
  ],
  authors: [{ name: "Thomas To" }],
  creator: "Thomas To",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL, // Update SITE_URL in constants/site.ts if/when you get a custom domain
    title: "Thomas To | Agentic Systems Architect",
    description: "Operationalizing Agentic Intelligence. Bridging wet-lab data with scalable cloud architecture.",
    siteName: "Thomas To Portfolio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thomas To | Agentic Systems Architect",
    description: "Operationalizing Agentic Intelligence. Bridging wet-lab data with scalable cloud architecture.",
  },
  icons: {
    icon: "/favicon.ico", // Ensure you have a favicon in /public
  },
};

// 📱 IMPROVED: Explicit Viewport for Mobile Responsiveness
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000", // Matches your dark mode aesthetic
};

// schema.org Person structured data — fed from the same credentials source as the
// visible page and the RAG prompt, so recruiter-facing SEO can't drift either.
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_OWNER_NAME,
  url: SITE_URL,
  jobTitle: "Fullstack AI/ML Engineer",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "University of California, Davis",
  },
  award: RECOGNITION_ITEMS.map((item) => item.program),
  sameAs: [GITHUB_PROFILE_URL, LINKEDIN_URL, YOUTUBE_URL],
  subjectOf: PRESS_FEATURES.map((feature) => ({
    "@type": "NewsArticle",
    headline: feature.headline,
    url: feature.url,
    publisher: {
      "@type": "Organization",
      name: feature.publication,
    },
  })),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-black text-zinc-900 dark:text-zinc-100`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <Script id="excalidraw-asset-path" strategy="beforeInteractive">
          {`window["EXCALIDRAW_ASSET_PATH"] = location.origin;`}
        </Script>
        {/* A2: MotionConfig wrapper for reduced motion support */}
        <MotionProvider>
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}