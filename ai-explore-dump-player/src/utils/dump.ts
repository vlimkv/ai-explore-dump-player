export type StreamEvent =
  | { event: "token"; data: { delta: string } }
  | { event: "done"; data: any }
  | { event: "error"; data: { message: string } };

export function parseJSONL(text: string): StreamEvent[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const events: StreamEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj?.event && obj?.data) events.push(obj as StreamEvent);
    } catch {
      // ignore invalid line
    }
  }
  return events;
}
