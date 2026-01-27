import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'katex/dist/katex.min.css';
import MotionProvider from '@/components/MotionProvider';

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
    url: "https://thomas-to-bcheme.github.io", // Update this if/when you get a custom domain
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-black text-zinc-900 dark:text-zinc-100`}
      >
        {/* A2: MotionConfig wrapper for reduced motion support */}
        <MotionProvider>
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}