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

export async function chatCompletion(opts: ChatOptions): Promise<string> {
  const res = await fetch(`${CHAT_BASE}/chat/completions`, {
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

  const json = (await res.json().catch(() => ({}))) as ChatResponse;
  if (!res.ok) {
    const message = json.error?.message ?? `Sarvam chat failed (${res.status})`;
    throw new Error(message);
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Sarvam chat returned an empty completion");
  return content;
}