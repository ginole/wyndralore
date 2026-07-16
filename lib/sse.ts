/** Reads a Server-Sent-Events response, invoking onChunk per data event. Resolves with the
 * `done` event's payload (or null if none arrived); throws on an `error` event. Same wire
 * format as /api/ai-reading/deep — see AiReadingPanel's local reader, which predates this. */
export async function readSseStream(res: Response, onChunk: (text: string) => void): Promise<Record<string, unknown> | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: Record<string, unknown> | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return donePayload;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
      if (evt.startsWith("event: error")) throw new Error("Generation failed mid-stream.");
      if (evt.startsWith("event: done")) {
        try {
          donePayload = dataLine ? JSON.parse(dataLine.slice(5).trim()) : {};
        } catch {
          donePayload = {};
        }
        continue;
      }
      if (!dataLine) continue;
      try {
        onChunk(JSON.parse(dataLine.slice(5).trim()));
      } catch {
        /* malformed keep-alive chunk */
      }
    }
  }
}
