import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";
import { z } from "zod";
import AiSystemInformation, {
  formatLivePipelineKpi,
  FALLBACK_PIPELINE_KPI_TEXT,
  LIVE_PIPELINE_KPI_PLACEHOLDER,
} from "@/data/AiSystemInformation";
import { getPipelineStats, type PipelineStats } from "@/lib/db/jobs";

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
  content: z.string().min(1), // Prevent empty messages
});

const ChatRequestSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, "At least one message is required"),
});

// =============================================================================
// LOGGING & ERROR HANDLING
// =============================================================================

interface LogContext {
  correlationId: string;
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
// GOOGLE API ERROR HANDLING
// =============================================================================

/**
 * Parse retry delay from Google API error message
 * Example message: "Resource has been exhausted (e.g. check quota). Retry in 30s"
 */
function parseGoogleRetryDelay(message: string): number | null {
  const match = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(parseFloat(match[1])) : null;
}

/**
 * Type guard for Google API quota exceeded errors
 */
function isGoogleQuotaError(error: unknown): error is GoogleGenerativeAIFetchError {
  return error instanceof GoogleGenerativeAIFetchError && error.status === 429;
}

// =============================================================================
// LIVE PIPELINE STATS (KPI paragraph in the system instruction)
// =============================================================================

// How long a cached getPipelineStats() result is reused before the next
// chat request pays for a fresh Neon round trip. The pipeline itself only
// changes up to 4x/day (its GitHub Actions cron), so anything well under
// that window is "fresh enough" for a KPI paragraph — this value exists
// purely to bound Neon read volume across a burst of chat messages hitting
// the same warm serverless instance.
const PIPELINE_STATS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let cachedPipelineStats: PipelineStats | null = null;
let cachedPipelineStatsAt = 0;

async function getCachedPipelineStats(logCtx: LogContext): Promise<PipelineStats | null> {
  const isFresh =
    cachedPipelineStats !== null && Date.now() - cachedPipelineStatsAt < PIPELINE_STATS_CACHE_TTL_MS;
  if (isFresh) return cachedPipelineStats;

  try {
    const stats = await getPipelineStats();
    cachedPipelineStats = stats;
    cachedPipelineStatsAt = Date.now();
    return stats;
  } catch (error) {
    log("WARN", "Failed to fetch live pipeline stats; falling back to static KPI text", {
      ...logCtx,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Deliberately not cached — the next request retries immediately
    // instead of being stuck on the fallback for a full TTL window over
    // one transient Neon blip.
    return null;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
  const correlationId = crypto.randomUUID();
  const logCtx: LogContext = { correlationId };

  try {
    // 1. Parse and Validate Request
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

    // 2. Transform Messages for Google API
    const history = messages.map((m) => ({
      role: m.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: m.content }],
    }));

    // 3. Initialize Model
    const pipelineStats = await getCachedPipelineStats(logCtx);
    const livePipelineKpiText = pipelineStats
      ? formatLivePipelineKpi(pipelineStats)
      : FALLBACK_PIPELINE_KPI_TEXT;
    const systemInstruction = AiSystemInformation.replace(
      LIVE_PIPELINE_KPI_PLACEHOLDER,
      livePipelineKpiText
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-pro-preview",
      systemInstruction,
    });

    const chat = model.startChat({
      history: history.slice(0, -1),
    });

    // 4. Send Message with Streaming
    const lastMessage = history[history.length - 1].parts[0].text;
    const result = await chat.sendMessageStream(lastMessage);

    // 5. Stream Response with Error Handling
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
      },
    });
  } catch (error) {
    // Handle Google Gemini quota exceeded errors specifically
    if (isGoogleQuotaError(error)) {
      const retryDelay = parseGoogleRetryDelay(error.message) || 30;
      log("WARN", "Google API quota exceeded", {
        ...logCtx,
        retryAfter: retryDelay,
        googleStatus: error.status,
      });
      const response = createErrorResponse(
        429,
        "GOOGLE_QUOTA_EXCEEDED",
        `AI service rate limit reached. Please wait ${retryDelay} seconds.`,
        correlationId
      );
      response.headers.set("Retry-After", retryDelay.toString());
      return response;
    }

    // Generic error handling
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