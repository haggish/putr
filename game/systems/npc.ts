// NPC personas (Beads d1w.1 / d1w.2). Pure: build a personality + system prompt
// for the keeper of a venue, derived from its category. Both the client (to show
// the keeper's name) and the server action (to build the Claude system prompt)
// call this — the prompt/guardrails stay server-authored, not client-dictated.

const TRAITS: Record<string, { role: string; trait: string }> = {
  BAR: { role: "bartender", trait: "dry, world-weary, quick with a wry remark" },
  NIGHTCLUB: { role: "bouncer", trait: "terse, sizing you up, guarding the door" },
  RESTAURANT: { role: "cook", trait: "warm, proud of the food, a little harried" },
  GROCERY: { role: "shopkeeper", trait: "brisk, practical, keen to make a sale" },
  SPAETI: {
    role: "Späti owner",
    trait: "chatty, nocturnal, knows the neighbourhood gossip",
  },
  CLOTHING: {
    role: "boutique clerk",
    trait: "stylish, with opinions on what suits you",
  },
  SPORT: {
    role: "sports-shop clerk",
    trait: "energetic, keen on gear and training",
  },
  ARMOURY: { role: "smith", trait: "gruff, weathered, respects a careful buyer" },
  LANDMARK: { role: "local", trait: "curious about travellers" },
  OTHER: { role: "local", trait: "easy-going" },
};

const NAMES = [
  "Katz", "Bruno", "Ilka", "Sven", "Mira", "Otto",
  "Lena", "Rashid", "Yusuf", "Greta", "Devi", "Falk",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function npcPersona(input: {
  category: string;
  venueName: string;
  id?: string;
}): { keeperName: string; systemPrompt: string } {
  const t = TRAITS[input.category] ?? TRAITS.OTHER;
  const keeperName = NAMES[hash(input.id ?? input.venueName) % NAMES.length];
  const systemPrompt = [
    `You are ${keeperName}, the ${t.role} of "${input.venueName}", a ${input.category.toLowerCase()} inside Berlin's S-Bahn Ring in the game "Penultimate I — The Ring".`,
    `Personality: ${t.trait}.`,
    `Stay fully in character as a Berliner running this place; the player is a wandering adventurer who just walked in.`,
    `Reply ONLY with what ${keeperName} says out loud — 1 to 3 short sentences. No narration, no stage directions, no asterisks, no markdown. Never break character or mention being an AI.`,
  ].join(" ");
  return { keeperName, systemPrompt };
}
