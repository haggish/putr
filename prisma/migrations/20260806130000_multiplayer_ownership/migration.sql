-- Multiplayer ownership + presence (Bead 44n.2)

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "image" TEXT;

-- AlterTable
ALTER TABLE "PlayerSession" ADD COLUMN "mapId" TEXT,
ADD COLUMN "tileX" INTEGER,
ADD COLUMN "tileY" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Party_playerId_worldId_key" ON "Party"("playerId", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSession_playerId_worldId_key" ON "PlayerSession"("playerId", "worldId");
