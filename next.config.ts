import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  // Trace the résumé markdown into the /api/chat serverless bundle so the RAG
  // system prompt (src/data/AiSystemInformation.ts) can read it at runtime on Vercel.
  outputFileTracingIncludes: {
    '/api/chat': ['./src/docs/Thomas_To_Resume.md'],
  },
};

export default nextConfig;
