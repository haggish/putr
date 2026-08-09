// NPC personas (Beads d1w.1 / d1w.2). Pure: build a personality + system prompt
// for the keeper of a venue, derived from its category (or a per-venue
// override), flavoured by its Berlin district. Both the client (to show the
// keeper's name) and the server action (to build the Claude system prompt) call
// this — the prompt/guardrails stay server-authored, not client-dictated.

interface Persona {
  role: string;
  trait: string;
}

const TRAITS: Record<string, Persona> = {
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

// Bespoke personalities for iconic, named venues. Matched by a keyword against
// the normalised venue name (lowercased, alphanumerics only) so OSM variants
// like "KitKatClub" / "Kit Kat Club" still hit. Add an entry here to give any
// single location its own owner personality, regardless of its category.
const OVERRIDES: { match: string; persona: Persona }[] = [
  {
    match: "berghain",
    persona: {
      role: "door bouncer",
      trait:
        "monolithic and near-silent, guarding a cathedral of techno where you alone decide who exists. You hold open contempt for loud tourists, phone cameras, bottle-service show-offs and anyone who asks about the queue or the 'criteria' — the right guest is serious, understated and never asks. You often just refuse with a flat 'Nicht heute.' and never explain why",
    },
  },
  {
    match: "kitkat",
    persona: {
      role: "door mistress",
      trait:
        "haughty and provocative, keeper of a fetish-and-techno temple who looks down on anyone who isn't a proper freak. Vanilla tourists in street clothes get a raised eyebrow and a curt reminder of the dress code — latex, leather, skin, or turn around. Teasing, blunt, and thoroughly unimpressed by the ordinary",
    },
  },
];

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

/** Resolve the persona for a venue: a named override wins, else the category. */
function personaFor(category: string, venueName: string): Persona {
  const norm = venueName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const override = OVERRIDES.find((o) => norm.includes(o.match));
  return override?.persona ?? TRAITS[category] ?? TRAITS.OTHER;
}

export function npcPersona(input: {
  category: string;
  venueName: string;
  /** District name, folded into the prompt when known. */
  district?: string;
  /** Cuisine tags + signature dishes (restaurants), so the cook talks real food. */
  cuisine?: string[];
  dishes?: string[];
  id?: string;
}): { keeperName: string; systemPrompt: string } {
  const p = personaFor(input.category, input.venueName);
  const keeperName = NAMES[hash(input.id ?? input.venueName) % NAMES.length];
  const where = input.district
    ? `in ${input.district}, inside Berlin's S-Bahn Ring`
    : "inside Berlin's S-Bahn Ring";
  const kind = input.category === "OTHER" ? "place" : input.category.toLowerCase();
  const article = /^[aeiou]/.test(kind) ? "an" : "a";
  const systemPrompt = [
    `You are ${keeperName}, the ${p.role} of "${input.venueName}", ${article} ${kind} ${where} in the game "Penultimate I — The Ring".`,
    input.district
      ? `Neighbourhood: ${input.district} — let its character colour how you speak and what you mention.`
      : "",
    `Personality: ${p.trait}.`,
    input.dishes?.length
      ? `You serve ${input.cuisine?.length ? input.cuisine.join("/") + " " : ""}food; the dishes you are proud of are ${input.dishes.join(", ")}. Recommend these real dishes if asked — do not invent a fancy tasting menu.`
      : input.cuisine?.length
        ? `You serve ${input.cuisine.join("/")} food.`
        : "",
    `Stay fully in character as a Berliner running this place; the player is a wandering adventurer who just walked in.`,
    `Reply ONLY with what ${keeperName} says out loud — 1 to 3 short sentences. No narration, no stage directions, no asterisks, no markdown. Never break character or mention being an AI.`,
  ]
    .filter(Boolean)
    .join(" ");
  return { keeperName, systemPrompt };
}