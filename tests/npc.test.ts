import { describe, it, expect } from "vitest";
import { npcPersona } from "@/game";

describe("npc personas", () => {
  it("builds a persona with a name and a category-appropriate role", () => {
    const p = npcPersona({ category: "BAR", venueName: "The Rusty Anchor" });
    expect(p.keeperName).toBeTruthy();
    expect(p.systemPrompt).toContain("The Rusty Anchor");
    expect(p.systemPrompt.toLowerCase()).toContain("bartender");
    expect(p.systemPrompt).toContain(p.keeperName);
  });

  it("is deterministic for the same venue id", () => {
    const a = npcPersona({ category: "SPAETI", venueName: "Späti 24", id: "node/1" });
    const b = npcPersona({ category: "SPAETI", venueName: "Späti 24", id: "node/1" });
    expect(a.keeperName).toBe(b.keeperName);
  });

  it("falls back gracefully for unknown categories", () => {
    const p = npcPersona({ category: "WHATEVER", venueName: "Somewhere" });
    expect(p.systemPrompt).toContain("Somewhere");
    expect(p.systemPrompt.toLowerCase()).toContain("local");
  });
});
