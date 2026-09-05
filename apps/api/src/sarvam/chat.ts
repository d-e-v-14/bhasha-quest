const CHAT_BASE = "https://api.sarvam.ai/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch failed/.test(err.message);
}

function causeDetail(err: unknown): string {
  const cause = (err as { cause?: { code?: string; message?: string } }).cause;
  return cause?.code ? `${cause.code}: ${cause.message ?? ""}`.trim() : String(err);
}

export async function chatCompletion(opts: ChatOptions): Promise<string> {
  const attempt = async (): Promise<Response> =>
    fetch(`${CHAT_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "api-subscription-key": opts.apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

  let res: Response;
  try {
    res = await attempt();
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    await new Promise((r) => setTimeout(r, 500));
    try {
      res = await attempt();
    } catch (err2) {
      throw new Error(`Sarvam chat unreachable (${causeDetail(err2)})`);
    }
  }

  const json = (await res.json().catch(() => ({}))) as ChatResponse;
  if (!res.ok) {
    const message = json.error?.message ?? `Sarvam chat failed (${res.status})`;
    throw new Error(message);
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Sarvam chat returned an empty completion");
  return content;
}