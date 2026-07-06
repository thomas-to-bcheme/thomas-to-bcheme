/**
 * Follow-up suggestion protocol.
 *
 * The RAG agent appends a single control line to the very end of every answer:
 *
 *   <<FOLLOWUPS>> First question? | Second question?
 *
 * The chat UI strips this line from the displayed (and spoken) answer and renders
 * the two questions as clickable chips that continue the conversation. Kept pure
 * and framework-free so it is the single source of truth for both the system
 * prompt (server) and the chat UI + TTS path (client), and is unit-testable.
 */

export const FOLLOWUP_MARKER = '<<FOLLOWUPS>>';

/** Follow-up questions are always presented in pairs. */
export const MAX_FOLLOWUPS = 2;

export interface ParsedAssistantMessage {
  /** The answer with the follow-up control line removed. */
  text: string;
  /** Up to two suggested follow-ups (empty until the control line finishes streaming). */
  followUps: string[];
}

/**
 * Split an assistant message into its display text and follow-up suggestions.
 *
 * Streaming-tolerant: while the control line is still arriving character by
 * character, a partial marker at the tail is hidden so the raw token never
 * flashes, and follow-ups are only returned once the full marker is present.
 */
export function parseAssistantMessage(content: string): ParsedAssistantMessage {
  const markerIndex = content.indexOf(FOLLOWUP_MARKER);

  // Guard clause: no complete marker yet — show the text, hiding any partial tail.
  if (markerIndex === -1) {
    return { text: stripTrailingPartialMarker(content), followUps: [] };
  }

  const text = content.slice(0, markerIndex).trimEnd();
  const followUps = content
    .slice(markerIndex + FOLLOWUP_MARKER.length)
    .split('|')
    .map((question) => question.trim())
    .filter((question) => question.length > 0)
    .slice(0, MAX_FOLLOWUPS);

  return { text, followUps };
}

/**
 * If the tail of `content` is a prefix of the marker (e.g. "…answer.<<FOLLOW"),
 * strip it so the incomplete control token never appears mid-stream. Matches the
 * longest partial to avoid leaving a stray "<" behind.
 */
function stripTrailingPartialMarker(content: string): string {
  const maxLength = Math.min(content.length, FOLLOWUP_MARKER.length - 1);
  for (let length = maxLength; length > 0; length--) {
    if (content.endsWith(FOLLOWUP_MARKER.slice(0, length))) {
      return content.slice(0, content.length - length).trimEnd();
    }
  }
  return content;
}
