// Seed the game world into Postgres from the generated asset (Bead 3rx.7).
// Idempotent: upserts the World + Districts and replaces Locations.
// Run: npm run db:seed:world  (needs the Postgres container + a built asset)

import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";

function slugify(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "d"
  );
}

async function main() {
  const asset = JSON.parse(
    readFileSync("public/world/berlin-overworld.json", "utf8"),
  );

  const world = await prisma.world.upsert({
    where: { slug: "berlin-ring" },
    update: {
      name: "Berlin — Inside the Ring",
      tileWidth: asset.width,
      tileHeight: asset.height,
      metersPerTile: asset.metersPerTile ?? 40,
    },
    create: {
      slug: "berlin-ring",
      name: "Berlin — Inside the Ring",
      tileWidth: asset.width,
      tileHeight: asset.height,
      metersPerTile: asset.metersPerTile ?? 40,
    },
  });

  // Districts (unique slug per world; dedupe deterministically).
  const used = new Set<string>();
  const idByName: Record<string, string> = {};
  for (const name of asset.districts as string[]) {
    let slug = slugify(name);
    let n = 2;
    while (used.has(slug)) slug = `${slugify(name)}-${n++}`;
    used.add(slug);
    const d = await prisma.district.upsert({
      where: { worldId_slug: { worldId: world.id, slug } },
      update: { name },
      create: { worldId: world.id, slug, name },
    });
    idByName[name] = d.id;
  }

  // Locations: wipe + recreate from the asset's placed venues.
  await prisma.location.deleteMany({ where: { worldId: world.id } });
  const districtAt = (x: number, y: number): string | null => {
    const i = y * asset.width + x;
    const ch = asset.districtGrid?.[i];
    if (!ch || ch === " ") return null;
    return asset.districts[ch.charCodeAt(0) - 48] ?? null;
  };
  const rows = (asset.venues as Array<{ id: string; name: string; category: string; x: number; y: number }>).map(
    (v) => ({
      worldId: world.id,
      districtId: idByName[districtAt(v.x, v.y) ?? ""] ?? null,
      name: v.name,
      category: v.category as never,
      tileX: v.x,
      tileY: v.y,
      osmRef: v.id,
    }),
  );
  await prisma.location.createMany({ data: rows });

  const [districts, locations] = await Promise.all([
    prisma.district.count({ where: { worldId: world.id } }),
    prisma.location.count({ where: { worldId: world.id } }),
  ]);
  console.log(
    `Seeded world "${world.slug}": ${districts} districts, ${locations} locations`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
