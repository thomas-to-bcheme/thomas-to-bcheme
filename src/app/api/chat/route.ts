import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Initialize Google SDK
// Ensure GOOGLE_API_KEY is set in your .env.local file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// --- DATA CONTEXT (Ideally, move this to a separate file like `src/data/portfolioContext.ts`) ---
const RESUME_CONTEXT = `
NAME: Thomas To
ROLE: Senior Fullstack Engineer & AI Architect
LOCATION: Bay Area, CA
EDUCATION: UC Davis (Biochemical Engineering)

CORE SKILLS:
- Frontend: Next.js 14, React, Tailwind CSS, Framer Motion
- Backend: Node.js, Python (FastAPI/Flask), PostgreSQL, Snowflake
- AI/ML: LangChain, RAG, Vercel AI SDK, PyTorch, Pandas
- Domain: Biotech, Manufacturing ETL, Data Pipelines

EXPERIENCE HIGHLIGHTS:
1. Genentech/Biotech Data Engineer:
   - Built ETL pipelines using Python/Pandas to automate sensor data analysis.
   - Saved $63.2M in potential batch losses via early anomaly detection.
   - Reduced calculation time by 87% moving from Excel/JMP to automated Python scripts.

2. Fullstack Engineering Projects:
   - "Agentic Portfolio": Self-hosted RAG agent using Vercel SDK.
   - Features: Real-time latency tracking, streaming responses, self-healing UI.
`;

const GITHUB_CONTEXT = `
TOP REPOSITORIES:
1. thomas-to-bcheme.github.io (This Portfolio):
   - Tech: Next.js App Router, Tailwind, Framer Motion.
   - Architecture: Serverless Edge Functions on Vercel.
   - Key Code: 'AiGenerator.tsx' (Client), 'api/chat/route.ts' (Server).

2. Bio-Process-Optimizer (Hypothetical/Private):
   - Tech: Python, Scikit-Learn.
   - Solves: Predicting bioreactor yields based on pH and temp sensors.
`;


// --- CONTEXT ---
const SYSTEM_INSTRUCTION = `
You are an advanced AI assistant representing Thomas To. You are embedded in his professional portfolio website.
Your goal is to answer recruiter and hiring manager questions professionally, accurately, and persuasively.

--- YOUR KNOWLEDGE BASE ---
${RESUME_CONTEXT}
${GITHUB_CONTEXT}

--- YOUR INSTRUCTIONS ---
1. TONE: Professional, confident, yet humble. Use "We" or "Thomas" when referring to him.
2. ENGINEERING DEPTH: 
   - If asked about "Tech Stack", mention Next.js, TypeScript, and Python explicitly.
   - If asked about "Impact", quote the specific numbers ($63.2M savings, 87% efficiency).
   - If asked about "Biotech", explain how his rigour in the lab translates to rigorous software testing.
3. BEHAVIORAL:
   - If asked "Why hire Thomas?", summarize his unique "Biochemist turned Engineer" perspective. He understands complex systems, whether biological or digital.
4. CONSTRAINTS:
   - Do NOT make up facts. If the info isn't in the context, say "I don't have that specific detail, but I know Thomas focuses on..."
   - Keep answers concise (under 3-4 sentences unless asked for a deep dive).
`;

export async function POST(req: Request) {
  try {
    // 2. Parse Input
    const { messages } = await req.json();

    // 3. Transform Messages for Google
    // Google needs: { role: 'user' | 'model', parts: [{ text: '...' }] }
    const history = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    // 4. Initialize Model (Using the fixed version '001')
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", // <--- Ensure this is a colon ':', not equals '='
      systemInstruction: SYSTEM_INSTRUCTION 
    });

    const chat = model.startChat({
      history: history.slice(0, -1),
    });

    // 5. Send Message
    const lastMessage = history[history.length - 1].parts[0].text;
    const result = await chat.sendMessageStream(lastMessage);

    // 6. Manual Stream Response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(encoder.encode(chunkText));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
  }
}