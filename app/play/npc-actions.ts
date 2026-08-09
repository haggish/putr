"use server";

// AI NPC dialogue (Bead d1w.3). Server-side Claude call — the API key stays in
// process.env.ANTHROPIC_API_KEY and never reaches the client. The persona/system
// prompt is built server-side from the venue (npcPersona), so the client can't
// dictate it. Short, in-character replies; graceful fallback with no key.

import Anthropic from "@anthropic-ai/sdk";
import { npcPersona } from "@/game";

// Default per current guidance; swap to "claude-haiku-4-5" for a cheaper/faster
// NPC if you expect a lot of chatter.
const NPC_MODEL = "claude-opus-4-8";

export interface NpcTurn {
  role: "user" | "assistant";
  content: string;
}

export async function npcReply(input: {
  category: string;
  venueName: string;
  district?: string;
  cuisine?: string[];
  dishes?: string[];
  id?: string;
  history: NpcTurn[];
  message: string;
}): Promise<{ reply: string }> {
  const message = input.message.slice(0, 500).trim();
  if (!message) return { reply: "…" };
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      reply:
        "…(the keeper stays silent — set ANTHROPIC_API_KEY in .env to bring them to life.)",
    };
  }

  const { systemPrompt } = npcPersona({
    category: input.category,
    venueName: input.venueName,
    district: input.district,
    cuisine: input.cuisine,
    dishes: input.dishes,
    id: input.id,
  });
  const history = input.history
    .slice(-6)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 500) }));

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: NPC_MODEL,
      max_tokens: 200,
      thinking: { type: "disabled" },
      system: systemPrompt,
      messages: [...history, { role: "user", content: message }],
    });
    const reply = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    return { reply: reply || "…" };
  } catch {
    return { reply: "…(the keeper frowns — something went wrong.)" };
  }
}
