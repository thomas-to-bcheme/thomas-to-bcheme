import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import AiSystemInformation from "@/data/AiSystemInformation";

// =============================================================================
// CONFIGURATION & VALIDATION
// =============================================================================

// Fail-fast: Validate required environment variables at module load
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error(
    "[FATAL] GOOGLE_API_KEY environment variable is not set. " +
    "Please add it to your .env.local file."
  );
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Request validation schema
const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000), // Prevent empty or excessively long messages
});

const ChatRequestSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, "At least one message is required")
    .max(100, "Maximum 100 messages allowed"),
});

// =============================================================================
// RATE LIMITING (In-memory, per-IP, Vercel-compatible)
// =============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // Max requests per window

// Simple in-memory store (resets on cold start - acceptable for Vercel serverless)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: Request): string {
  // Vercel forwards real IP via x-forwarded-for header
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetAt: record.resetAt };
}

// =============================================================================
// LOGGING & ERROR HANDLING
// =============================================================================

interface LogContext {
  correlationId: string;
  ip: string;
  [key: string]: unknown;
}

function log(level: "INFO" | "WARN" | "ERROR", message: string, context: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(entry));
}

function createErrorResponse(
  status: number,
  code: string,
  message: string,
  correlationId: string
): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
      correlationId,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  const ip = getRateLimitKey(req);
  const logCtx: LogContext = { correlationId, ip };

  try {
    // 1. Rate Limiting
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      log("WARN", "Rate limit exceeded", logCtx);
      const response = createErrorResponse(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Too many requests. Please try again later.",
        correlationId
      );
      response.headers.set("Retry-After", Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
      response.headers.set("X-RateLimit-Remaining", "0");
      return response;
    }

    // 2. Parse and Validate Request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      log("WARN", "Invalid JSON in request body", logCtx);
      return createErrorResponse(400, "INVALID_JSON", "Request body must be valid JSON", correlationId);
    }

    const validation = ChatRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      log("WARN", "Request validation failed", { ...logCtx, errors });
      return createErrorResponse(400, "VALIDATION_ERROR", errors, correlationId);
    }

    const { messages } = validation.data;
    log("INFO", "Chat request received", { ...logCtx, messageCount: messages.length });

    // 3. Transform Messages for Google API
    const history = messages.map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    }));

    // 4. Initialize Model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: AiSystemInformation,
    });

    const chat = model.startChat({
      history: history.slice(0, -1),
    });

    // 5. Send Message with Streaming
    const lastMessage = history[history.length - 1].parts[0].text;
    const result = await chat.sendMessageStream(lastMessage);

    // 6. Stream Response with Error Handling
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            controller.enqueue(encoder.encode(chunkText));
          }
          controller.close();
          log("INFO", "Chat stream completed successfully", logCtx);
        } catch (streamError) {
          log("ERROR", "Stream error during response", {
            ...logCtx,
            error: streamError instanceof Error ? streamError.message : "Unknown stream error",
          });
          // Send error indicator to client before closing
          controller.enqueue(encoder.encode("\n\n[Error: Stream interrupted]"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Correlation-ID": correlationId,
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", "Unhandled API error", { ...logCtx, error: errorMessage });

    return createErrorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again.",
      correlationId
    );
  }
}