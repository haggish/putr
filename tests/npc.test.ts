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

  it("folds the district into the prompt when known", () => {
    const p = npcPersona({
      category: "BAR",
      venueName: "The Rusty Anchor",
      district: "Kreuzberg",
    });
    expect(p.systemPrompt).toContain("Kreuzberg");
    // Absent when unknown — no stray "Neighbourhood:" line.
    const q = npcPersona({ category: "BAR", venueName: "The Rusty Anchor" });
    expect(q.systemPrompt).not.toContain("Neighbourhood");
  });

  it("tells a restaurant cook its real cuisine and dishes", () => {
    const p = npcPersona({
      category: "RESTAURANT",
      venueName: "Thai Art",
      cuisine: ["Thai"],
      dishes: ["Tom Yum Soup", "Pad Thai"],
    });
    expect(p.systemPrompt).toContain("Thai");
    expect(p.systemPrompt).toContain("Tom Yum Soup");
    expect(p.systemPrompt).toContain("Pad Thai");
    // Without dish data, no menu line is fabricated.
    const q = npcPersona({ category: "RESTAURANT", venueName: "Somewhere" });
    expect(q.systemPrompt).not.toContain("dishes you are proud of");
  });

  it("applies a per-venue personality override, ignoring the category", () => {
    const berghain = npcPersona({ category: "NIGHTCLUB", venueName: "Berghain" });
    expect(berghain.systemPrompt).toContain("Nicht heute"); // bespoke, not the default bouncer

    // Name variants still match (normalised: alphanumerics only).
    const kitkat = npcPersona({ category: "OTHER", venueName: "Kit Kat Club" });
    expect(kitkat.systemPrompt.toLowerCase()).toContain("freak");
    expect(kitkat.systemPrompt.toLowerCase()).toContain("dress code");
  });
});
