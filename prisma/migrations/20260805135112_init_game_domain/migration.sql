-- CreateEnum
CREATE TYPE "TileMapKind" AS ENUM ('OVERWORLD', 'INTERIOR', 'DUNGEON_LEVEL');

-- CreateEnum
CREATE TYPE "LocationCategory" AS ENUM ('BAR', 'RESTAURANT', 'GROCERY', 'SPAETI', 'CLOTHING', 'ARMOURY', 'SPORT', 'NIGHTCLUB', 'LANDMARK', 'OTHER');

-- CreateEnum
CREATE TYPE "Race" AS ENUM ('HUMAN', 'ELF', 'DWARF', 'HALFLING', 'GNOME');

-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('FIGHTER', 'CLERIC', 'WIZARD', 'THIEF', 'PALADIN', 'RANGER', 'BARBARIAN', 'DRUID');

-- CreateEnum
CREATE TYPE "GearKind" AS ENUM ('WEAPON', 'ARMOR', 'SHIELD', 'CONSUMABLE', 'MISC');

-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('WEAPON', 'ARMOR', 'SHIELD');

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tileWidth" INTEGER NOT NULL DEFAULT 256,
    "tileHeight" INTEGER NOT NULL DEFAULT 256,
    "metersPerTile" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TileMap" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "kind" "TileMapKind" NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "tiles" JSONB,
    "assetKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TileMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "districtId" TEXT,
    "name" TEXT NOT NULL,
    "category" "LocationCategory" NOT NULL,
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "osmRef" TEXT,
    "interiorMapId" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Party',
    "mapId" TEXT,
    "tileX" INTEGER NOT NULL DEFAULT 0,
    "tileY" INTEGER NOT NULL DEFAULT 0,
    "facing" TEXT NOT NULL DEFAULT 'south',
    "gold" INTEGER NOT NULL DEFAULT 0,
    "flags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "race" "Race" NOT NULL DEFAULT 'HUMAN',
    "class" "CharacterClass" NOT NULL DEFAULT 'FIGHTER',
    "level" INTEGER NOT NULL DEFAULT 1,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "maxHp" INTEGER NOT NULL DEFAULT 100,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "wisdom" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gear" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "GearKind" NOT NULL,
    "attack" INTEGER NOT NULL DEFAULT 0,
    "defense" INTEGER NOT NULL DEFAULT 0,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Gear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterGear" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "gearId" TEXT NOT NULL,
    "slot" "EquipSlot",
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CharacterGear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSession" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "partyId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "World_slug_key" ON "World"("slug");

-- CreateIndex
CREATE INDEX "TileMap_worldId_kind_idx" ON "TileMap"("worldId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "District_worldId_slug_key" ON "District"("worldId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Location_interiorMapId_key" ON "Location"("interiorMapId");

-- CreateIndex
CREATE INDEX "Location_worldId_category_idx" ON "Location"("worldId", "category");

-- CreateIndex
CREATE INDEX "Location_worldId_tileX_tileY_idx" ON "Location"("worldId", "tileX", "tileY");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Party_worldId_idx" ON "Party"("worldId");

-- CreateIndex
CREATE INDEX "Party_playerId_idx" ON "Party"("playerId");

-- CreateIndex
CREATE INDEX "Character_partyId_idx" ON "Character"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Gear_slug_key" ON "Gear"("slug");

-- CreateIndex
CREATE INDEX "CharacterGear_characterId_idx" ON "CharacterGear"("characterId");

-- CreateIndex
CREATE INDEX "PlayerSession_worldId_idx" ON "PlayerSession"("worldId");

-- CreateIndex
CREATE INDEX "PlayerSession_playerId_idx" ON "PlayerSession"("playerId");

-- AddForeignKey
ALTER TABLE "TileMap" ADD CONSTRAINT "TileMap_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_interiorMapId_fkey" FOREIGN KEY ("interiorMapId") REFERENCES "TileMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "TileMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterGear" ADD CONSTRAINT "CharacterGear_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterGear" ADD CONSTRAINT "CharacterGear_gearId_fkey" FOREIGN KEY ("gearId") REFERENCES "Gear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
