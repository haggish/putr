import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the migrate/CLI connection URL out of schema.prisma into here.
// The runtime client connects separately via the pg driver adapter (lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
